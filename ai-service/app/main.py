from fastapi import FastAPI

app = FastAPI(
    title="BlogPilot AI Service",
    version="1.0.0"
)

@app.get("/health")
def health():
    return {
        "success":True,
        "message":"BlogPilot AI service is running"
    }