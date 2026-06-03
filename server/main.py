from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from graph import app_graph
import time
from fastapi.middleware.cors import CORSMiddleware 

app = FastAPI(title="AI Solutions Architect API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BlueprintRequest(BaseModel):
    transcript: str

@app.get("/")
def read_root():
    return {"status": "AI Architect Squad API is running."}

@app.post("/generate-blueprint")
async def generate_blueprint(request: BlueprintRequest):
    if not request.transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    print(f"Received transcript of length: {len(request.transcript)} characters")
    
    # Initialize the state with the user's transcript
    initial_state = {
        "transcript": request.transcript,
        "project_summary": "",
        "clarification_questions": [],
        "missing_requirements": [],
        "stakeholder_feedback": ""
    }

    try:
        start_time = time.time()
        
        # Run the LangGraph pipeline
        # Using invoke() runs the whole graph synchronously
        final_state = app_graph.invoke(initial_state)
        
        execution_time = round(time.time() - start_time, 2)
        print(f"Pipeline finished in {execution_time} seconds")

        # Return the generated outputs
        return {
            "status": "success",
            "execution_time_seconds": execution_time,
            "data": {
                "project_summary": final_state["project_summary"],
                "missing_requirements": final_state["missing_requirements"],
                "clarification_questions": final_state["clarification_questions"],
                "stakeholder_feedback": final_state["stakeholder_feedback"],
                "architecture_diagram": final_state["architecture_diagram"], 
                "sprint_backlog": final_state["sprint_backlog"] 
            }
        }
    except Exception as e:
        print(f"Error during graph execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)