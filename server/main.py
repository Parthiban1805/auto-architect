from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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
    
    initial_state = {
        "transcript": request.transcript,
        "project_summary": "",
        "clarification_questions": [],
        "missing_requirements": [],
        "stakeholder_feedback": "",
        "startup_proposal": "",
        "enterprise_proposal": "",
        "architecture_debate": "",
        "architecture_diagram": "",
        "sprint_backlog": {}
    }

    try:
        start_time = time.time()
        final_state = app_graph.invoke(initial_state)
        execution_time = round(time.time() - start_time, 2)
        print(f"Pipeline finished in {execution_time} seconds")

        return {
            "status": "success",
            "execution_time_seconds": execution_time,
            "data": {
                "project_summary": final_state["project_summary"],
                "missing_requirements": final_state["missing_requirements"],
                "clarification_questions": final_state["clarification_questions"],
                "stakeholder_feedback": final_state["stakeholder_feedback"],
                "architecture_debate": final_state["architecture_debate"], 
                "architecture_diagram": final_state["architecture_diagram"],
                "sprint_backlog": final_state["sprint_backlog"]
            }
        }
    except Exception as e:
        print(f"Error during graph execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/generate-blueprint")
async def websocket_generate_blueprint(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        transcript = data.get("transcript")
        if not transcript:
            await websocket.send_json({"type": "error", "message": "Transcript is required"})
            await websocket.close()
            return
            
        print(f"[WS] Received transcript of length: {len(transcript)} characters")
        
        await websocket.send_json({"type": "status", "message": "Agent 1: Reading & Summarizing Transcript..."})
        
        initial_state = {
            "transcript": transcript,
            "project_summary": "",
            "clarification_questions": [],
            "missing_requirements": [],
            "stakeholder_feedback": "",
            "startup_proposal": "",
            "enterprise_proposal": "",
            "architecture_debate": "",
            "architecture_diagram": "",
            "sprint_backlog": {}
        }
        
        start_time = time.time()
        state = initial_state.copy()
        
        async for chunk in app_graph.astream(initial_state):
            for node_name, values in chunk.items():
                print(f"[WS] Completed node: {node_name}")
                state.update(values)
                if node_name == "memory":
                    await websocket.send_json({"type": "status", "message": "Agent 2: Analyzing Requirements & Gaps..."})
                elif node_name == "gap":
                    await websocket.send_json({"type": "status", "message": "Agent 3: Gathering Stakeholder Critiques..."})
                elif node_name == "stakeholder":
                    await websocket.send_json({"type": "status", "message": "Agent 4: Generating Startup MVP Architecture..."})
                elif node_name == "startup_cto":
                    await websocket.send_json({"type": "status", "message": "Agent 5: Designing Enterprise Scalability..."})
                elif node_name == "enterprise_arch":
                    await websocket.send_json({"type": "status", "message": "Agent 6: Moderating Debate & Generating Diagram..."})
                elif node_name == "moderator":
                    await websocket.send_json({"type": "status", "message": "Agent 7: Creating Sprint Planning & Backlog..."})
        
        execution_time = round(time.time() - start_time, 2)
        print(f"[WS] Pipeline finished in {execution_time} seconds")
        
        await websocket.send_json({
            "type": "result",
            "execution_time_seconds": execution_time,
            "data": {
                "project_summary": state["project_summary"],
                "missing_requirements": state["missing_requirements"],
                "clarification_questions": state["clarification_questions"],
                "stakeholder_feedback": state["stakeholder_feedback"],
                "architecture_debate": state["architecture_debate"], 
                "architecture_diagram": state["architecture_diagram"],
                "sprint_backlog": state["sprint_backlog"]
            }
        })
        
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error during websocket execution: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)