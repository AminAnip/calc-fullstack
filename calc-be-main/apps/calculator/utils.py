import google.generativeai as genai
import ast
import json
import re
from PIL import Image
from constants import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

def analyze_image(img: Image, dict_of_vars: dict):                                                  
    model = genai.GenerativeModel(model_name="gemini-2.0-flash")
    dict_of_vars_str = json.dumps(dict_of_vars, ensure_ascii=False)
    prompt = (
        f"You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them. "
        f"Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right). Parentheses have the highest priority, followed by Exponents, then Multiplication and Division, and lastly Addition and Subtraction. "
        f"For example: "
        f"Q. 2 + 3 * 4 "
        f"(3 * 4) => 12, 2 + 12 = 14. "
        f"Q. 2 + 3 + 5 * 4 - 8 / 2 "
        f"5 * 4 => 20, 8 / 2 => 4, 2 + 3 => 5, 5 + 20 => 25, 25 - 4 => 21. "
        f"YOU CAN HAVE SIX TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, AND ONLY ONE CASE SHALL APPLY EVERY TIME: "
        f"Cases: "
        f"1. Simple math expressions (e.g. 2 + 2, 3 * 4): Return: [{{'expr': expression, 'result': result}}] "
        f"2. Set of equations (e.g. 3y + 4x = 0): Return each variable result: [{{'expr': 'x', 'result': val, 'assign': True}}, ...] "
        f"3. Assignments (e.g. x = 4): Return: [{{'expr': 'x', 'result': 4, 'assign': True}}, ...] "
        f"4. Graphical math problems (e.g. diagrams, geometry): Return: [{{'expr': description, 'result': solution}}] "
        f"5. Abstract/drawing interpretation (e.g. love, patriotism): Return: [{{'expr': description, 'result': concept}}] "
        f"6. Matrix-based expressions: These include matrix addition, subtraction, multiplication, trace (sum of diagonal elements), transpose (flip rows/columns), and determinant calculation. "
        f"For example: "
        f"Matrix Addition: A = [[1,2],[3,4]], B = [[5,6],[7,8]] => A + B = [[6,8],[10,12]] "
        f"Matrix Subtraction: A - B = [[-4,-4],[-4,-4]] "
        f"Matrix Multiplication: A * B = [[19,22],[43,50]] "
        f"Matrix Transpose: transpose([[1,2,3],[4,5,6]]) = [[1,4],[2,5],[3,6]] "
        f"Matrix Trace: trace([[1,0],[0,2]]) = 3 "
        f"Matrix Determinant: det([[1,2],[3,4]]) = -2 "
        f"Return: [{{'expr': 'A + B', 'result': [[6,8],[10,12]], 'assign': False}}] or similar. "
        f"Here is a dictionary of user-assigned variables. If the expression uses any of these, replace them accordingly: {dict_of_vars_str}. "
        f"DO NOT USE BACKTICKS OR MARKDOWN. RETURN ONLY A VALID PYTHON LIST OF DICTS. NO EXTRA TEXT."
    )
    
    try:
        response = model.generate_content([prompt, img])
        print("Raw Gemini response:", response.text)
        
        response_text = response.text.strip()
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        
        print("Cleaned response text:", response_text)
        
        answers = []
        try:
            answers = ast.literal_eval(response_text)
            print("Successfully parsed with ast.literal_eval")
        except (ValueError, SyntaxError) as e:
            print(f"Error parsing with ast.literal_eval: {e}")
            try:
                answers = json.loads(response_text)
                print("Successfully parsed with JSON")
            except json.JSONDecodeError as json_e:
                print(f"Error parsing with JSON: {json_e}")
                answers = [{"expr": "Error parsing response", "result": "Unable to process image", "assign": False}]
        
        if not isinstance(answers, list):
            answers = [answers]
        
        for answer in answers:
            if isinstance(answer, dict) and 'assign' not in answer:
                answer['assign'] = False
        
        return answers
        
    except Exception as e:
        print(f"Error in analyze_image: {e}")
        return [{"expr": "Error", "result": f"Failed to analyze image: {str(e)}", "assign": False}]
