from fastapi import APIRouter
import base64
from io import BytesIO
from apps.calculator.utils import analyze_image
from schema import ImageData
from PIL import Image

router = APIRouter()

@router.post('')
async def run(data: ImageData):
    print("Received data:", data)
    try:
        # Decode the base64 image
        image_data = base64.b64decode(data.image.split(",")[1])
        print("Image data decoded successfully")
        
        # Convert to PIL Image
        image_bytes = BytesIO(image_data)
        image = Image.open(image_bytes)
        print("Image opened successfully")
        
        # Analyze the image using Gemini API
        responses = analyze_image(image, dict_of_vars=data.dict_of_vars)
        print("analyze_image completed:", responses)
        
        # Process the responses
        result_data = []
        for response_item in responses:
            result_data.append(response_item)
        
        print('Final responses in route:', responses)
        
        return {"message": "Image processed", "data": result_data, "status": "success"}
        
    except Exception as e:
        print("Error occurred:", str(e))
        return {"message": f"Error processing image: {str(e)}", "data": [], "status": "error"}