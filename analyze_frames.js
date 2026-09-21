const fs = require('fs');
const { PNG } = require('pngjs');

const filePath = './frontend/public/assets/sprites/characters/bamboo_horse_action.png';

fs.createReadStream(filePath)
    .pipe(new PNG())
    .on('parsed', function() {
        const width = this.width;
        const height = this.height;
        console.log(`Image: ${width}x${height}`);

        // Check horizontal rows (gaps)
        let rowGaps = [];
        let inGap = true;
        let gapStart = 0;
        
        for (let y = 0; y < height; y++) {
            let rowHasPixel = false;
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                if (this.data[idx + 3] > 0) {
                    rowHasPixel = true;
                    break;
                }
            }
            
            if (rowHasPixel) {
                if (inGap) {
                    inGap = false;
                    if (y > gapStart) rowGaps.push({ start: gapStart, end: y - 1 });
                }
            } else {
                if (!inGap) {
                    inGap = true;
                    gapStart = y;
                }
            }
        }
        if (inGap) rowGaps.push({ start: gapStart, end: height - 1 });

        console.log('Row Gaps:', rowGaps);
        
        // Check vertical columns (gaps)
        let colGaps = [];
        inGap = true;
        gapStart = 0;
        
        for (let x = 0; x < width; x++) {
            let colHasPixel = false;
            for (let y = 0; y < height; y++) {
                const idx = (width * y + x) << 2;
                if (this.data[idx + 3] > 0) {
                    colHasPixel = true;
                    break;
                }
            }
            
            if (colHasPixel) {
                if (inGap) {
                    inGap = false;
                    if (x > gapStart) colGaps.push({ start: gapStart, end: x - 1 });
                }
            } else {
                if (!inGap) {
                    inGap = true;
                    gapStart = x;
                }
            }
        }
        if (inGap) colGaps.push({ start: gapStart, end: width - 1 });

        console.log('Col Gaps:', colGaps);

        // Check for reflection (bottom half is flipped top half?)
        // Or just identical rows?
        const midY = Math.floor(height / 2);
        let isReflection = true;
        let isIdentical = true;
        
        // Sample check
        for (let x = 0; x < width; x += 10) {
            for (let y = 0; y < midY; y += 10) {
                const idxTop = (width * y + x) << 2;
                const idxBot = (width * (height - 1 - y) + x) << 2; // Reflection
                const idxCopy = (width * (midY + y) + x) << 2; // Identical copy
                
                // Compare alpha
                if (Math.abs(this.data[idxTop + 3] - this.data[idxBot + 3]) > 10) isReflection = false;
                if (Math.abs(this.data[idxTop + 3] - this.data[idxCopy + 3]) > 10) isIdentical = false;
            }
        }
        
        console.log('Is Reflection (roughly):', isReflection);
        console.log('Is Identical Copy (roughly):', isIdentical);
    });
