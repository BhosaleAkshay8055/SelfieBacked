from rembg import remove
from PIL import Image
from io import BytesIO

# Load the input image
input_image_path = './akshay.png'
output_image_path = 'output_image.png'

# Open the image file and read it
with open(input_image_path, 'rb') as input_file:
    input_image = input_file.read()

# Remove the background
output_image = remove(input_image)

# Convert the binary output to an image
output_image = Image.open(BytesIO(output_image))

# Check if the image has an alpha channel (transparency)
if output_image.mode != 'RGBA':
    output_image = output_image.convert('RGBA')

# Save the image with transparency preserved
output_image.save(output_image_path)

print(f"Image saved at {output_image_path}")
