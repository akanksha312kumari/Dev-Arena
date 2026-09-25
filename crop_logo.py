from PIL import Image, ImageDraw

# Open the image (this time using the correct cat image)
img = Image.open('C:/Users/Akanksha/.gemini/antigravity-ide/brain/6e573069-880a-4caf-9a2d-993a1c348c9c/media__1784315500915.png').convert("RGBA")

# Ensure it's a square
size = min(img.size)
img = img.crop(((img.size[0] - size) // 2,
                (img.size[1] - size) // 2,
                (img.size[0] + size) // 2,
                (img.size[1] + size) // 2))

# Create a mask for the circle
mask = Image.new('L', (size, size), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse((0, 0, size, size), fill=255)

# Create an output image with transparency
output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
output.paste(img, (0, 0), mask=mask)

# Save the image to the assets folder, overwriting the old logo
output.save('C:/Users/Akanksha/Desktop/DevArena/src/assets/logoooo.png')
print("Successfully cropped and saved the CORRECT new logo.")
