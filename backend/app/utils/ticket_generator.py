import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import logging

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS_DIR = os.path.join(BASE_DIR, "assets", "fonts")
IMAGES_DIR = os.path.join(BASE_DIR, "assets", "images")
LOGO_PATH = os.path.join(IMAGES_DIR, "q4queue-logo-final.png")

FONT_BOLD = os.path.join(FONTS_DIR, "Inter-Bold.ttf")
FONT_MEDIUM = os.path.join(FONTS_DIR, "Inter-Medium.ttf")
FONT_REGULAR = os.path.join(FONTS_DIR, "Inter-Regular.ttf")

def draw_rounded_rect(draw: ImageDraw.ImageDraw, xy, radius, fill):
    """Draws a rectangle with rounded corners using arcs and rectangles."""
    x0, y0 = xy[0]
    x1, y1 = xy[1]
    
    # Draw corners
    draw.pieslice([x0, y0, x0 + radius * 2, y0 + radius * 2], 180, 270, fill=fill)
    draw.pieslice([x1 - radius * 2, y0, x1, y0 + radius * 2], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - radius * 2, x0 + radius * 2, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - radius * 2, y1 - radius * 2, x1, y1], 0, 90, fill=fill)
    
    # Draw inner rectangles
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)


def generate_ticket_image(
    token_number: str,
    branch_name: str,
    queue_name: str,
    date_str: str,
    time_str: str,
    people_ahead: str,
) -> BytesIO:
    """
    Generates a minimalist digital ticket image by using a pre-designed PNG template.
    """
    TEMPLATE_PATH = os.path.join(IMAGES_DIR, "template.png")
    
    if os.path.exists(TEMPLATE_PATH):
        img = Image.open(TEMPLATE_PATH).convert("RGB")
    else:
        # Fallback to white canvas if template is missing
        img = Image.new("RGB", (1254, 1254), (255, 255, 255))
        
    draw = ImageDraw.Draw(img)

    # Load fonts (Optimized for 1254x1254 template)
    try:
        font_token = ImageFont.truetype(FONT_BOLD, 140)
        font_branch = ImageFont.truetype(FONT_MEDIUM, 40)
        font_queue = ImageFont.truetype(FONT_REGULAR, 32)
        font_datetime = ImageFont.truetype(FONT_REGULAR, 26)
        font_people = ImageFont.truetype(FONT_BOLD, 56)
    except Exception as e:
        logger.error(f"Error loading fonts: {e}")
        font_token = font_branch = font_queue = font_datetime = font_people = ImageFont.load_default()

    # Colors
    text_dark = (30, 41, 59)      # slate-800
    text_blue = (0, 71, 255)      # Primary blue
    
    # 1. Date & Time (Left aligned next to icons)
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
                font_token = ImageFont.truetype(FONT_BOLD, token_size)
            except:
                break
        else:
            break
            
    # Token number centered
    draw.text(((img.width - token_w) // 2, 430), token_text, fill=text_blue, font=font_token)
    
    # 3. Branch & Queue (Placed right of the pin icon on the same line)
    branch_text = branch_name.upper()
    draw.text((370, 665), branch_text, fill=text_dark, font=font_branch)
    
    queue_text = queue_name.upper()
    draw.text((370, 720), queue_text, fill=text_blue, font=font_queue)
    
    # 4. People Ahead Number (Moved slightly right to be closer to the text)
    people_str = str(people_ahead).zfill(2)
    draw.text((350, 855), people_str, fill=text_blue, font=font_people)
    
    # Save to BytesIO
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer
