const Jimp = require('jimp');

Jimp.read(process.argv[2])
  .then(image => {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      var red = this.bitmap.data[idx + 0];
      var green = this.bitmap.data[idx + 1];
      var blue = this.bitmap.data[idx + 2];
      
      // if color is near white, make it transparent using a smooth falloff instead of binary cut
      const distToWhite = Math.sqrt(Math.pow(255-red, 2) + Math.pow(255-green, 2) + Math.pow(255-blue, 2));
      
      if (distToWhite < 40) {
        // very close to white -> totally transparent
        this.bitmap.data[idx + 3] = 0;
      } else if (distToWhite < 100) {
        // edge anti-aliasing (semi-transparent)
        this.bitmap.data[idx + 3] = Math.floor(((distToWhite - 40) / 60) * 255);
      }
    });
    image.write(process.argv[3]);
    console.log("done");
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
