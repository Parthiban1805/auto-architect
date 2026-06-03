import os
import re
from typing import TypedDict, List
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langgraph.graph import StateGraph, END

load_dotenv()

# ==========================================
# 1. DEFINE THE STATE (Added architecture_diagram)
# ==========================================
class ArchitectState(TypedDict):
    transcript: str
    project_summary: str
    clarification_questions: List[str]
    missing_requirements: List[str]
    stakeholder_feedback: str
    architecture_diagram: str
    sprint_backlog: dict
# ==========================================
# 2. CONFIGURE GROQ LLM
# ==========================================
llm = ChatGroq(
    temperature=0.2, 
    model_name="llama-3.3-70b-versatile", 
    groq_api_key=os.environ["GROQ_API_KEY"]
)
class UserStory(BaseModel):
    title: str = Field(description="Title of the user story")
    description: str = Field(description="Format: As a [type of user], I want [some goal] so that [some reason]")
    story_points: int = Field(description="Estimated effort using Fibonacci sequence (1, 2, 3, 5, 8)")

class SprintEpic(BaseModel):
    epic_name: str = Field(description="Name of the Epic (e.g., Authentication, Payments)")
    stories: List[UserStory] = Field(description="List of user stories belonging to this Epic")

class SprintBacklogOutput(BaseModel):
    epics: List[SprintEpic] = Field(description="List of all project Epics")


class GapAnalysisOutput(BaseModel):
    missing_requirements: List[str] = Field(description="List of missing business rules or requirements")
    clarification_questions: List[str] = Field(description="Questions to ask the client to clarify ambiguities")

# ==========================================
# 3. DEFINE AGENT NODES
# ==========================================
def meeting_memory_agent(state: ArchitectState):
    print("---AGENT 1: Summarizing Transcript---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a technical Business Analyst. Summarize the following meeting transcript into a structured Project Context Document."),
        ("human", "Transcript:\n{transcript}")
    ])
    response = (prompt | llm).invoke({"transcript": state["transcript"]})
    return {"project_summary": response.content}

def gap_analyzer_agent(state: ArchitectState):
    print("---AGENT 2: Analyzing Gaps---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Requirements Engineer. Analyze the project summary. Identify missing technical requirements (e.g., auth, payments, hosting) and generate clarification questions."),
        ("human", "Project Summary:\n{project_summary}")
    ])
    structured_llm = llm.with_structured_output(GapAnalysisOutput)
    response = (prompt | structured_llm).invoke({"project_summary": state["project_summary"]})
    return {
        "missing_requirements": response.missing_requirements,
        "clarification_questions": response.clarification_questions
    }

def stakeholder_persona_agent(state: ArchitectState):
    print("---AGENT 3: Gathering Stakeholder Feedback---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Proxy Board of Directors (CEO, CTO, CISO). Review the project summary and missing requirements. Provide a brief critique from the perspective of Security, Cost, and Scalability."),
        ("human", "Project Summary:\n{project_summary}\n\nMissing Requirements:\n{missing_requirements}")
    ])
    response = (prompt | llm).invoke({
        "project_summary": state["project_summary"],
        "missing_requirements": "\n".join(state["missing_requirements"])
    })
    return {"stakeholder_feedback": response.content}

# NEW AGENT
def architecture_agent(state: ArchitectState):
    print("---AGENT 4: Designing System Architecture---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an Enterprise Cloud Architect. Based on the project summary, design a high-level system architecture.
        
        CRITICAL RULES FOR MERMAID.JS:
        1. Output ONLY valid Mermaid graph TD syntax. No markdown wrappers.
        2. DO NOT use `|>` at the end of labels.
        
        CORRECT SYNTAX EXAMPLE:
        A[Mobile App] -->|REST API| B(Backend)
        
        INCORRECT SYNTAX (DO NOT DO THIS):
        A[Mobile App] -->|REST API|> B(Backend)
        
        Begin your response immediately with `graph TD`.
        """),
        ("human", "Project Summary:\n{project_summary}")
    ])
    
    response = (prompt | llm).invoke({"project_summary": state["project_summary"]})
    
    # Extra safety cleanup on the backend side
    clean_mermaid = response.content.replace("```mermaid", "").replace("```", "").strip()
    
    return {"architecture_diagram": clean_mermaid}

def sprint_planning_agent(state: ArchitectState):
    print("---AGENT 5: Generating Sprint Backlog---")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a highly experienced Agile Scrum Master. 
        Take the project summary and missing requirements and break them down into actionable development Epics and User Stories.
        Assign realistic story points (1, 2, 3, 5, 8) to each story based on complexity."""),
        ("human", "Project Summary:\n{project_summary}\n\nTechnical Requirements:\n{missing_requirements}")
    ])
    
    # Force strict JSON output matching our Epics/Stories model
    structured_llm = llm.with_structured_output(SprintBacklogOutput)
    response = (prompt | structured_llm).invoke({
        "project_summary": state["project_summary"],
        "missing_requirements": "\n".join(state["missing_requirements"])
    })
    
    # Return as a dictionary for the state
    return {"sprint_backlog": response.dict()}

# ==========================================
# 4. BUILD AND COMPILE THE LANGGRAPH
# ==========================================
workflow = StateGraph(ArchitectState)

workflow.add_node("memory_agent", meeting_memory_agent)
workflow.add_node("gap_analyzer", gap_analyzer_agent)
workflow.add_node("stakeholder_agent", stakeholder_persona_agent)
workflow.add_node("architecture_agent", architecture_agent) # ADDED NODE
workflow.add_node("sprint_planner", sprint_planning_agent)
workflow.set_entry_point("memory_agent")
workflow.add_edge("memory_agent", "gap_analyzer")
workflow.add_edge("gap_analyzer", "stakeholder_agent")
workflow.add_edge("stakeholder_agent", "architecture_agent") # ROUTED TO NEW NODE
workflow.add_edge("architecture_agent", "sprint_planner") 
workflow.add_edge("sprint_planner", END)                     

app_graph = workflow.compile()