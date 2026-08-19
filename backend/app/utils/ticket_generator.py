import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import logging

logger = logging.getLogger(__name__)

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
FONTS_DIR = os.path.join(STATIC_DIR, "fonts")

FONT_PATH = os.path.join(FONTS_DIR, "Inter.ttf")

# Primary template path
PRIMARY_TEMPLATE = os.path.join(STATIC_DIR, "token_template_bakery.png")
FALLBACK_TEMPLATE_FRONTEND = os.path.join(BASE_DIR, "..", "frontend", "public", "token template bakery.png")


def generate_ticket_image(
    token_number: str,
    branch_name: str,
    queue_name: str,
    date_str: str,
    time_str: str,
    people_ahead: str,
) -> BytesIO:
    """
    Generates a dynamic digital ticket image by stamping details onto the pre-designed template.
    """
    template_file = PRIMARY_TEMPLATE
    if not os.path.exists(template_file) and os.path.exists(FALLBACK_TEMPLATE_FRONTEND):
        template_file = FALLBACK_TEMPLATE_FRONTEND

    if os.path.exists(template_file):
        img = Image.open(template_file).convert("RGB")
    else:
        # Fallback to white canvas if template is missing
        img = Image.new("RGB", (1254, 1254), (255, 255, 255))
        
    draw = ImageDraw.Draw(img)

    # Load fonts (Optimized for 1254x1254 template)
    try:
        font_token = ImageFont.truetype(FONT_PATH, 140) if os.path.exists(FONT_PATH) else ImageFont.load_default()
        font_branch = ImageFont.truetype(FONT_PATH, 40) if os.path.exists(FONT_PATH) else ImageFont.load_default()
        font_queue = ImageFont.truetype(FONT_PATH, 32) if os.path.exists(FONT_PATH) else ImageFont.load_default()
        font_datetime = ImageFont.truetype(FONT_PATH, 26) if os.path.exists(FONT_PATH) else ImageFont.load_default()
        font_people = ImageFont.truetype(FONT_PATH, 56) if os.path.exists(FONT_PATH) else ImageFont.load_default()
    except Exception as e:
        logger.error(f"Error loading fonts: {e}")
        font_token = font_branch = font_queue = font_datetime = font_people = ImageFont.load_default()

    # Colors
    text_dark = (30, 41, 59)      # slate-800
    text_blue = (0, 71, 255)      # Primary blue
    
    # 1. Date & Time
    draw.text((950, 155), date_str, fill=text_dark, font=font_datetime)
    draw.text((950, 210), time_str, fill=text_dark, font=font_datetime)
    
    # 2. Token Number (Centered dynamically via bounding box at Y=430)
    token_text = str(token_number)
    token_size = 140
    max_token_width = img.width - 200
    
    while True:
        token_bbox = draw.textbbox((0, 0), token_text, font=font_token)
        token_w = token_bbox[2] - token_bbox[0]
        if token_w > max_token_width and token_size > 80:
            token_size -= 10
            try:
                font_token = ImageFont.truetype(FONT_PATH, token_size)
            except Exception:
                break
        else:
            break
            
    # Token number centered
    draw.text(((img.width - token_w) // 2, 430), token_text, fill=text_blue, font=font_token)
    
    # 3. Branch & Queue
    branch_text = (branch_name or "MAIN BRANCH").upper()
    draw.text((370, 665), branch_text, fill=text_dark, font=font_branch)
    
    queue_text = (queue_name or "GENERAL QUEUE").upper()
    draw.text((370, 720), queue_text, fill=text_blue, font=font_queue)
    
    # 4. People Ahead Number
    people_str = str(people_ahead).zfill(2)
    draw.text((350, 855), people_str, fill=text_blue, font=font_people)
    
    # Save to BytesIO
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer
