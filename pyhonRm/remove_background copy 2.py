from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse
from rembg import remove
from PIL import Image
from io import BytesIO
import uvicorn
import os

app = FastAPI()

# Directory to save input and output images
UPLOAD_DIR = "./images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/getImage")
async def get_image(file: UploadFile = File(...)):
    # Read the uploaded file
    input_image = await file.read()

    # Save the input image to local directory
    input_image_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(input_image_path, "wb") as f:
        f.write(input_image)

    # Remove the background
    output_image = remove(input_image)

    # Convert the binary output to an image
    output_image = Image.open(BytesIO(output_image))

    # Check if the image has an alpha channel (transparency)
    if output_image.mode != 'RGBA':
        output_image = output_image.convert('RGBA')

    # Save the output image to local directory
    output_image_path = os.path.join(UPLOAD_DIR, "output_" + file.filename)
    output_image.save(output_image_path, format="PNG")

    # Save the output image to a BytesIO object for response
    output_buffer = BytesIO()
    output_image.save(output_buffer, format="PNG")
    output_buffer.seek(0)

    # Return the output image as a response
    return StreamingResponse(output_buffer, media_type="image/png")

if __name__ == "__main__":
    uvicorn.run(app, host="http://127.0.0.1/", port=8000)
