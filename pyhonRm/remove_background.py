import base64
import logging
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from rembg import remove
from PIL import Image
from io import BytesIO
import uvicorn
import os
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Directory to save input and output images
UPLOAD_DIR = "./images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Define a Pydantic model for the incoming JSON request
class ImageData(BaseModel):
    image_base64: str  # Base64-encoded image string

@app.post("/api/processImage")
async def process_image(data: ImageData):
    logger.info("Received image data")

    # Fix base64 string padding if necessary
    padding = len(data.image_base64) % 4
    if padding != 0:
        data.image_base64 += "=" * (4 - padding)

    try:
        # Decode the base64 image data
        image_data = base64.b64decode(data.image_base64)

        # Save the input image to a local directory with a generic name
        input_image_path = os.path.join(UPLOAD_DIR, "input_image.png")
        with open(input_image_path, "wb") as f:
            f.write(image_data)

        # Remove the background
        output_image = remove(image_data)

        # Convert the binary output to an image
        output_image = Image.open(BytesIO(output_image))

        # Check if the image has an alpha channel (transparency)
        if output_image.mode != 'RGBA':
            output_image = output_image.convert('RGBA')

        # Save the output image to a local directory
        output_image_path = os.path.join(UPLOAD_DIR, "output_image.png")
        output_image.save(output_image_path, format="PNG")

        # Log the output image
        logger.info(f"Output image saved to {output_image_path}")

        # Convert the output image to base64 for response
        output_buffer = BytesIO()
        output_image.save(output_buffer, format="PNG")
        output_buffer.seek(0)
        
        # Convert the output image to base64
        output_base64 = base64.b64encode(output_buffer.getvalue()).decode("utf-8")
        
        # Log the base64 string length (for debugging)
        logger.info(f"Base64 length of the output image: {len(output_base64)}")

        # Return the base64 string as the response
        return {"image": output_base64}

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return {"error": "Failed to process image", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
