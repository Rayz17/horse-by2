import os
import argparse
from PIL import Image
import numpy as np
from scipy.ndimage import label, find_objects

def remove_background_smart(img, tolerance=15, extreme_tolerance=8):
    """
    智能去底：检测四个角的颜色，仅移除与背景连通的区域（防止掏空角色内部）
    """
    img = img.convert("RGBA")
    data = np.array(img)
    
    # Sample corners
    h, w = data.shape[:2]
    corners_coords = [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1)]
    corners_pixels = [data[r, c] for r, c in corners_coords]
    
    # Calculate average background color from corners
    bg_color = np.median(corners_pixels, axis=0).astype(int)
    r_bg, g_bg, b_bg = bg_color[0], bg_color[1], bg_color[2]
    
    # RGB values
    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
    
    # 1. Create color mask: pixels close to background color
    # Use a stricter tolerance for nearly pure white/black backgrounds to avoid eating into characters
    if (r_bg > 240 and g_bg > 240 and b_bg > 240) or (r_bg < 15 and g_bg < 15 and b_bg < 15):
        actual_tolerance = extreme_tolerance
    else:
        actual_tolerance = tolerance

    color_mask = (np.abs(r - r_bg) < actual_tolerance) & \
                 (np.abs(g - g_bg) < actual_tolerance) & \
                 (np.abs(b - b_bg) < actual_tolerance)
    
    # 2. Use connected components to find the "exterior" background
    # Structure 3x3 allows diagonal connection
    structure = np.ones((3, 3), dtype=int)
    labeled_array, num_features = label(color_mask, structure=structure)
    
    # 3. Identify which labels touch the corners
    bg_labels = set()
    for r, c in corners_coords:
        if color_mask[r, c]: # Only check if the corner itself is considered background color
            bg_labels.add(labeled_array[r, c])
            
    # 4. Create final mask: must be correct color AND connected to a corner
    final_mask = np.isin(labeled_array, list(bg_labels))
    
    # Set alpha to 0 for exterior background only
    data[:,:,3][final_mask] = 0
    
    return Image.fromarray(data)

def sort_frames_reading_order(frames):
    """
    按阅读顺序排序（从上到下，从左到右）
    解决 AI 偶尔生成多行网格的问题
    """
    if not frames:
        return []
        
    # Sort primarily by Y
    frames.sort(key=lambda k: k['y'])
    
    # Group into rows
    rows = []
    current_row = [frames[0]]
    current_y = frames[0]['y']
    row_h_threshold = frames[0]['h'] * 0.5 # Threshold to consider a new row
    
    for i in range(1, len(frames)):
        frame = frames[i]
        if abs(frame['y'] - current_y) < row_h_threshold:
            # Same row
            current_row.append(frame)
        else:
            # New row
            rows.append(current_row)
            current_row = [frame]
            current_y = frame['y']
    rows.append(current_row)
    
    # Sort each row by X and flatten
    sorted_frames = []
    for row in rows:
        row.sort(key=lambda k: k['x'])
        for frame in row:
            sorted_frames.append(frame)
            
    return sorted_frames

def split_by_projection(img, target_count=3):
    """
    Use vertical projection profile to find gaps between frames.
    Robust against faint noise or connected components failure.
    """
    # Convert to alpha array
    img_rgba = img.convert("RGBA")
    alpha = np.array(img_rgba)[:, :, 3]
    h, w = alpha.shape
    
    # Vertical projection (sum of alpha along Y-axis)
    projection = np.sum(alpha, axis=0)
    
    # Normalize projection to 0-1 range for easier thresholding
    max_val = np.max(projection)
    if max_val > 0:
        projection = projection / max_val
    
    # Threshold to consider a column "content" (not gap)
    # Lower threshold to catch faint details
    is_content = projection > 0.01
    
    segments = []
    in_segment = False
    start = 0
    
    # Find segments with content separated by gaps
    for i in range(w):
        if is_content[i]:
            if not in_segment:
                in_segment = True
                start = i
        else:
            if in_segment:
                in_segment = False
                # Filter tiny noise segments (< 5px width)
                if (i - start) > 5:
                    segments.append((start, i))
    
    if in_segment and (w - start) > 5:
        segments.append((start, w))
        
    # --- New Merge Logic for excessive segments ---
    if len(segments) > target_count:
        print(f"  -> Projection found {len(segments)} segments (expected {target_count}). Merging smallest into closest...")
        segment_info = []
        for s, e in segments:
            # Capacity/weight is the sum of projection values in this segment
            weight = np.sum(projection[s:e])
            center = (s + e) / 2.0
            segment_info.append({'s': s, 'e': e, 'weight': weight, 'center': center})
            
        while len(segment_info) > target_count:
            # Find the segment with the smallest weight
            min_idx = min(range(len(segment_info)), key=lambda i: segment_info[i]['weight'])
            smallest = segment_info[min_idx]
            
            # Find the closest neighbor by center distance
            closest_idx = -1
            min_dist = float('inf')
            for i, info in enumerate(segment_info):
                if i == min_idx: continue
                dist = abs(info['center'] - smallest['center'])
                if dist < min_dist:
                    min_dist = dist
                    closest_idx = i
                    
            # Merge smallest into closest
            closest = segment_info[closest_idx]
            new_s = min(smallest['s'], closest['s'])
            new_e = max(smallest['e'], closest['e'])
            new_weight = smallest['weight'] + closest['weight']
            # Update center to the geometric center of the new merged bounding box
            new_center = (new_s + new_e) / 2.0
            
            segment_info[closest_idx] = {'s': new_s, 'e': new_e, 'weight': new_weight, 'center': new_center}
            segment_info.pop(min_idx)
            
        # Re-sort segments by X coordinate
        segment_info.sort(key=lambda x: x['s'])
        segments = [(info['s'], info['e']) for info in segment_info]
    # ----------------------------------------------
        
    # Attempt to split segments
    extracted = []
    for s, e in segments:
        extracted.append(img_rgba.crop((s, 0, e, h)))

    return extracted

def smart_extract_frames(img, target_count=3, min_area=500):
    # Try Projection Split First (Best for horizontal strips with gaps)
    print("  -> Attempting Projection Split...")
    frames = split_by_projection(img, target_count)
    
    if len(frames) == target_count:
        print(f"  -> Projection Split successful: found {len(frames)} frames")
        return frames

    print("  -> Projection Split unclear, falling back to Connected Components...")

    # 1. Get Alpha & Binarize
    alpha = np.array(img)[:, :, 3]
    mask = alpha > 10
    
    # 2. Label
    structure = np.ones((3, 3), dtype=int) 
    labeled, n_components = label(mask, structure)
    
    if n_components == 0:
        # Fallback: If no components found but alpha exists, assume 1 big component
        if np.sum(mask) > 100:
             print("  -> No distinct components, treating as single block")
             w, h = img.size
             raw_frames = [{
                 'img': img,
                 'x': 0, 'y': 0, 'w': w, 'h': h
             }]
             sorted_frames = raw_frames
        else:
             return []
    else:
        # 3. Get initial bounding boxes
        slices = find_objects(labeled)
        
        raw_frames = []
        for i, sl in enumerate(slices):
            y_slice, x_slice = sl
            h = y_slice.stop - y_slice.start
            w = x_slice.stop - x_slice.start
            if w * h < min_area: continue
                
            raw_frames.append({
                'img': img.crop((x_slice.start, y_slice.start, x_slice.stop, y_slice.stop)),
                'x': x_slice.start,
                'y': y_slice.start,
                'w': w,
                'h': h
            })
        
        # --- 核心升级：阅读顺序排序 ---
        sorted_frames = sort_frames_reading_order(raw_frames)
    
    # --- 连体婴分离逻辑 ---
    final_frames = []
    total_img_w = img.size[0]
    total_img_h = img.size[1]
    
    # Force horizontal split if only 1 frame found but image is wide
    if len(sorted_frames) == 1 and total_img_w > total_img_h * 2 and target_count >= 3:
        print(f"  -> Detected single wide frame (AR > 2:1), forcing split into {target_count} parts...")
        frame = sorted_frames[0]
        sub_w = frame['w'] // target_count
        source_img = frame['img']
        
        for k in range(target_count):
            left = k * sub_w
            right = (k + 1) * sub_w if k < target_count - 1 else frame['w']
            sub_img = source_img.crop((left, 0, right, frame['h']))
            
            bbox = sub_img.getbbox()
            if bbox:
                sub_img = sub_img.crop(bbox)
                final_frames.append(sub_img)
            else:
                # If empty after crop, just append original slice
                final_frames.append(sub_img)
    elif len(sorted_frames) > 0:
        median_w = np.median([f['w'] for f in sorted_frames])
        estimated_frame_w = median_w
        
        for frame in sorted_frames:
            # Check if frame is suspiciously wide (> 1.8x median)
            if frame['w'] > (estimated_frame_w * 1.8):
                split_count = max(2, round(frame['w'] / estimated_frame_w))
                print(f"  -> Detected merged frame (Width: {frame['w']}), splitting into {split_count} parts...")
                
                sub_w = frame['w'] // split_count
                source_img = frame['img']
                
                for k in range(split_count):
                    left = k * sub_w
                    right = (k + 1) * sub_w if k < split_count - 1 else frame['w']
                    sub_img = source_img.crop((left, 0, right, frame['h']))
                    
                    bbox = sub_img.getbbox()
                    if bbox:
                        sub_img = sub_img.crop(bbox)
                        final_frames.append(sub_img)
            else:
                final_frames.append(frame['img'])
    else:
        # Fallback: Just slice equally if nothing found but image exists?
        # Usually handled by n_components check above
        estimated_frame_w = total_img_w / target_count
    
    return final_frames

def process_smart_action_sheet(input_path, output_path, target_frames=3, frame_height=512):
    print(f"Processing Action Sheet: {input_path}")
    try:
        img = Image.open(input_path)
        img = remove_background_smart(img)
        
        frames = smart_extract_frames(img, target_count=target_frames)
        print(f"  -> Extracted {len(frames)} frames")
        
        if len(frames) == 0:
            print("  -> No content found!")
            return

        selected_frames = frames
        
        if len(selected_frames) > target_frames:
            print(f"  -> Too many frames, keeping first {target_frames}")
            selected_frames = selected_frames[:target_frames]
            
        while len(selected_frames) < target_frames:
            print("  -> Not enough frames, duplicating last frame")
            selected_frames.append(selected_frames[-1])

        processed_frames = []
        for f in selected_frames:
            w, h = f.size
            ratio = frame_height / h
            new_w = int(w * ratio)
            new_h = frame_height
            f_resized = f.resize((new_w, new_h), Image.Resampling.LANCZOS)
            processed_frames.append(f_resized)

        max_w = max(f.size[0] for f in processed_frames)
        cell_w = max_w + 40 
        
        sheet_w = cell_w * target_frames
        sheet_h = frame_height
        
        final_sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
        
        for i, f in enumerate(processed_frames):
            fw, fh = f.size
            x = (i * cell_w) + (cell_w - fw) // 2
            y = sheet_h - fh
            final_sheet.paste(f, (x, y))
            
        final_sheet.save(output_path)
        print(f"  -> Saved to {output_path}")

    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def process_base_sprite(input_path, output_path, target_size=(512, 682)):
    print(f"Processing Base Character: {input_path}")
    try:
        img = Image.open(input_path).convert("RGBA")

        # 基础立绘只清理与边缘连通的背景留白，再统一缩放到画布内
        trimmed = remove_background_smart(img, tolerance=18, extreme_tolerance=10)
        bbox = trimmed.getbbox()
        if bbox:
            left, top, right, bottom = bbox
            padding = 8
            bbox = (
                max(0, left - padding),
                max(0, top - padding),
                min(img.width, right + padding),
                min(img.height, bottom + padding)
            )
            trimmed = trimmed.crop(bbox)

        w, h = trimmed.size
        target_w, target_h = target_size
        ratio = min((target_w - 36) / w, (target_h - 36) / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        trimmed = trimmed.resize((new_w, new_h), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
        x = (target_w - new_w) // 2
        y = (target_h - new_h) // 2
        canvas.paste(trimmed, (x, y), trimmed)
        canvas.save(output_path)
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def process_ui_asset(input_path, output_path, remove_bg=True):
    print(f"Processing UI Asset: {input_path}")
    try:
        img = Image.open(input_path)
        if remove_bg:
            img = remove_background_smart(img)
        
        # Save as is, preserving dimensions
        img.save(output_path)
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def remove_background_item(img, corner_tolerance=18, preserve_light_tolerance=8):
    """
    道具专用去底：四角 flood fill 移除白/灰背景，严格保护道具本体浅色像素。
    - 使用较宽松的 corner_tolerance 移除边缘白/灰
    - 对“纯白”(RGB>250)区域用更小容差，避免抠掉道具的奶白/米色部分
    """
    img = img.convert("RGBA")
    data = np.array(img)
    h, w = data.shape[:2]

    corners_coords = [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1)]
    corners_pixels = [data[r, c] for r, c in corners_coords]
    bg_color = np.median(corners_pixels, axis=0).astype(int)
    r_bg, g_bg, b_bg = bg_color[0], bg_color[1], bg_color[2]

    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
    # 纯白背景：用较小容差，避免吃掉道具浅色
    if r_bg > 250 and g_bg > 250 and b_bg > 250:
        actual_tolerance = preserve_light_tolerance
    # 浅灰背景：适中容差
    elif r_bg > 220 and g_bg > 220 and b_bg > 220:
        actual_tolerance = min(corner_tolerance, 15)
    else:
        actual_tolerance = corner_tolerance

    color_mask = (np.abs(r - r_bg) < actual_tolerance) & \
                 (np.abs(g - g_bg) < actual_tolerance) & \
                 (np.abs(b - b_bg) < actual_tolerance)

    structure = np.ones((3, 3), dtype=int)
    labeled_array, num_features = label(color_mask, structure=structure)
    bg_labels = set()
    for r, c in corners_coords:
        if color_mask[r, c]:
            bg_labels.add(labeled_array[r, c])

    final_mask = np.isin(labeled_array, list(bg_labels))
    data[:,:,3][final_mask] = 0
    return Image.fromarray(data)


def process_item_asset(input_path, output_path):
    print(f"Processing Item Asset: {input_path}")
    try:
        img = Image.open(input_path)
        img = remove_background_item(img, corner_tolerance=18, preserve_light_tolerance=8)
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
        img.save(output_path)
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Process game assets")
    parser.add_argument("--input", default="frontend/raw_assets", help="Input directory")
    parser.add_argument("--output_root", default="frontend/public/assets", help="Output root directory")
    args = parser.parse_args()
    
    # Define output subdirectories
    dirs = {
        'char': os.path.join(args.output_root, "sprites/characters"),
        'ui': os.path.join(args.output_root, "ui"),
        'item': os.path.join(args.output_root, "sprites/items"),
        'vfx': os.path.join(args.output_root, "sprites/vfx")
    }
    
    for d in dirs.values():
        if not os.path.exists(d):
            os.makedirs(d)
        
    for filename in os.listdir(args.input):
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue
            
        input_path = os.path.join(args.input, filename)
        name, ext = os.path.splitext(filename)
        
        # Dispatch logic
        if name.startswith("bg_"):
            # Backgrounds: No BG removal, save to UI
            output_path = os.path.join(dirs['ui'], f"{name}.png")
            process_ui_asset(input_path, output_path, remove_bg=False)
            
        elif name.startswith(("ui_", "border_", "icon_", "btn_", "skill_")):
            # UI Elements: BG removal, save to UI
            output_path = os.path.join(dirs['ui'], f"{name}.png")
            process_ui_asset(input_path, output_path, remove_bg=True)
            
        elif name.startswith("item_"):
            # Items: stronger white BG removal + crop to content
            output_path = os.path.join(dirs['item'], f"{name}.png")
            process_item_asset(input_path, output_path)
            
        elif name.startswith("particle_"):
            # VFX: BG removal, save to VFX
            output_path = os.path.join(dirs['vfx'], f"{name}.png")
            process_ui_asset(input_path, output_path, remove_bg=True)
            
        elif "_action" in name:
            # Character Action Sheet
            output_path = os.path.join(dirs['char'], f"{name}.png")
            process_smart_action_sheet(input_path, output_path)
            
        elif "_idle" in name:
            print(f"Skipping legacy _idle file: {filename}")
            
        else:
            # Default: Character Base Sprite
            output_path = os.path.join(dirs['char'], f"{name}.png")
            process_base_sprite(input_path, output_path)

if __name__ == "__main__":
    main()
