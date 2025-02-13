const sharp = require('sharp');
const fs = require('fs');


// Paths to the images
const image1Path = './ganpati.jpg'; // Base image
const image2Path = './user_7_2024-10-17T09-09-15.541Z.png'; // Image to be placed in the center

// Output path for the merged image
const outputPath = './merged_image_2.jpg';

// Function to merge two images
async function mergeImages() {
  try {
    // Get metadata for the base image (image1)
    const image1Metadata = await sharp(image1Path).metadata();
    const image1Width = image1Metadata.width;
    const image1Height = image1Metadata.height;

    // Resize the second image (image2) to fit within the base image dimensions
    const resizedImage2Buffer = await sharp(image2Path)
      .resize({
        width: Math.floor(image1Width * 0.5), // Resize to 50% of the base image width
        height: Math.floor(image1Height * 0.5), // Resize to 50% of the base image height
        fit: 'inside', // Ensure the second image fits within these dimensions
      })
      .toBuffer();

    // Calculate position to center the second image on the base image
    const top = Math.floor((image1Height - Math.floor(image1Height * 0.5)) / 2);
    const left = Math.floor((image1Width - Math.floor(image1Width * 0.5)) / 2);

    // Composite (merge) the resized second image onto the base image
    await sharp(image1Path)
      .composite([
        {
          input: resizedImage2Buffer,
          top: top,  // Vertical position
          left: left, // Horizontal position
        },
      ]) 
      .toFile(outputPath); // Save the merged image

    console.log('Images merged successfully!');
  } catch (error) {
    console.error('Error merging images:', error);
  }
}

// Call the function to merge images
mergeImages();
