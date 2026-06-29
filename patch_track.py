import re

file_path = "/Users/muzammil/Documents/q4queue/qrq/backend/app/api/v1/endpoints/tracking.py"
with open(file_path, "r") as f:
    content = f.read()

new_content = content.replace("except ValueError as exc:\n        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))", 
"except ValueError as exc:\n        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))\n    except Exception as exc:\n        import traceback\n        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=traceback.format_exc())")

with open(file_path, "w") as f:
    f.write(new_content)
