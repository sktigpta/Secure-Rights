from ultralytics import YOLO

model = YOLO("yolov8n.pt")  # Or yolov5n.pt if using older
results = model("your_video.mp4")  # Automatically uses GPU if available
results[0].save("output/")
