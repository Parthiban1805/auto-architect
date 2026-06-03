import os
from typing import TypedDict, List
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

# ==========================================
# 1. DEFINE THE STATE (Added Debate Fields)
# ==========================================
class ArchitectState(TypedDict):
    transcript: str
    project_summary: str
    clarification_questions: List[str]
    missing_requirements: List[str]
    stakeholder_feedback: str
    startup_proposal: str        # NEW
    enterprise_proposal: str     # NEW
    architecture_debate: str     # NEW (The comparison matrix)
    architecture_diagram: str
    sprint_backlog: dict

# ==========================================
# 2. CONFIGURE GROQ LLM & PYDANTIC
# ==========================================
llm = ChatGroq(temperature=0.2, model_name="llama-3.3-70b-versatile", groq_api_key=os.environ["GROQ_API_KEY"])

class GapAnalysisOutput(BaseModel):
    missing_requirements: List[str] = Field(description="List of missing business rules or requirements")
    clarification_questions: List[str] = Field(description="Questions to ask the client to clarify ambiguities")

class UserStory(BaseModel):
    title: str = Field(description="Title of the user story")
    description: str = Field(description="Format: As a [user], I want [goal] so that [reason]")
    story_points: int = Field(description="Estimated effort (1, 2, 3, 5, 8)")

class SprintEpic(BaseModel):
    epic_name: str = Field(description="Name of the Epic")
    stories: List[UserStory] = Field(description="List of user stories")

class SprintBacklogOutput(BaseModel):
    epics: List[SprintEpic] = Field(description="List of all project Epics")

# ==========================================
# 3. DEFINE AGENT NODES
# ==========================================
def meeting_memory_agent(state: ArchitectState):
    print("---AGENT 1: Summarizing Transcript---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a technical Business Analyst. Summarize the transcript into a Project Context Document."),
        ("human", "Transcript:\n{transcript}")
    ])
    return {"project_summary": (prompt | llm).invoke({"transcript": state["transcript"]}).content}

def gap_analyzer_agent(state: ArchitectState):
    print("---AGENT 2: Analyzing Gaps---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Requirements Engineer. Identify missing technical requirements and generate clarification questions."),
        ("human", "Project Summary:\n{project_summary}")
    ])
    response = (prompt | llm.with_structured_output(GapAnalysisOutput)).invoke({"project_summary": state["project_summary"]})
    return {"missing_requirements": response.missing_requirements, "clarification_questions": response.clarification_questions}

def stakeholder_persona_agent(state: ArchitectState):
    print("---AGENT 3: Gathering Stakeholder Feedback---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Proxy Board (CEO, CTO, CISO). Review the project summary and missing requirements. Provide a critique on Security, Cost, and Scalability."),
        ("human", "Project Summary:\n{project_summary}\n\nMissing Requirements:\n{missing_requirements}")
    ])
    response = (prompt | llm).invoke({"project_summary": state["project_summary"], "missing_requirements": "\n".join(state["missing_requirements"])})
    return {"stakeholder_feedback": response.content}

# --- NEW: THE DEBATE AGENTS ---

def startup_cto_agent(state: ArchitectState):
    print("---AGENT 4A: Startup CTO (Cost Optimizer)---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Startup CTO. Propose a fast, cheap, monolithic MVP architecture. Focus on low infrastructure costs. Do not use Mermaid. Just write 2 short paragraphs describing the tech stack."),
        ("human", "Project Summary:\n{project_summary}")
    ])
    return {"startup_proposal": (prompt | llm).invoke({"project_summary": state["project_summary"]}).content}

def enterprise_architect_agent(state: ArchitectState):
    print("---AGENT 4B: Enterprise Architect (Scalability)---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an Enterprise Architect. Propose a highly scalable, microservices-based architecture using Kubernetes, caching, and event-driven patterns. Do not use Mermaid. Just write 2 short paragraphs describing the tech stack."),
        ("human", "Project Summary:\n{project_summary}")
    ])
    return {"enterprise_proposal": (prompt | llm).invoke({"project_summary": state["project_summary"]}).content}

def moderator_agent(state: ArchitectState):
    print("---AGENT 5: Chief Architect Moderator---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the Chief Solutions Architect. Review the Startup and Enterprise proposals.
        
        PART 1: Write a brief Markdown comparison with 'Advantages' and 'Disadvantages' for both. Finally, declare your balanced recommended stack.
        
        PART 2: Draw the recommended architecture using valid Mermaid.js graph TD syntax.
        
        CRITICAL RULES FOR MERMAID:
        - Separate Part 1 and Part 2 with the exact text: "===DIAGRAM==="
        - Do not use `|>` at the end of arrows in Mermaid.
        - No markdown wrappers around the Mermaid code. Just start with `graph TD`.
        """),
        ("human", "Startup Proposal:\n{startup}\n\nEnterprise Proposal:\n{enterprise}")
    ])
    response = (prompt | llm).invoke({"startup": state["startup_proposal"], "enterprise": state["enterprise_proposal"]}).content
    
    # Split the response into the text debate and the mermaid diagram
    parts = response.split("===DIAGRAM===")
    debate_text = parts[0].strip()
    mermaid_code = parts[1].replace("```mermaid", "").replace("```", "").strip() if len(parts) > 1 else "graph TD\n A[Error generating diagram]"
    
    return {"architecture_debate": debate_text, "architecture_diagram": mermaid_code}

def sprint_planning_agent(state: ArchitectState):
    print("---AGENT 6: Generating Sprint Backlog---")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a Scrum Master. Break down the project into Epics and User Stories with Story Points."),
        ("human", "Project Summary:\n{project_summary}\n\nTechnical Requirements:\n{missing_requirements}")
    ])
    response = (prompt | llm.with_structured_output(SprintBacklogOutput)).invoke({"project_summary": state["project_summary"], "missing_requirements": "\n".join(state["missing_requirements"])})
    return {"sprint_backlog": response.dict()}

# ==========================================
# 4. BUILD THE GRAPH
# ==========================================
workflow = StateGraph(ArchitectState)

workflow.add_node("memory", meeting_memory_agent)
workflow.add_node("gap", gap_analyzer_agent)
workflow.add_node("stakeholder", stakeholder_persona_agent)
workflow.add_node("startup_cto", startup_cto_agent)
workflow.add_node("enterprise_arch", enterprise_architect_agent)
workflow.add_node("moderator", moderator_agent)
workflow.add_node("sprint", sprint_planning_agent)

# Routing
workflow.set_entry_point("memory")
workflow.add_edge("memory", "gap")
workflow.add_edge("gap", "stakeholder")
workflow.add_edge("stakeholder", "startup_cto")
workflow.add_edge("startup_cto", "enterprise_arch")
workflow.add_edge("enterprise_arch", "moderator")
workflow.add_edge("moderator", "sprint")
workflow.add_edge("sprint", END)

memory_saver = MemorySaver()
app_graph = workflow.compile(checkpointer=memory_saver, interrupt_after=["gap"])