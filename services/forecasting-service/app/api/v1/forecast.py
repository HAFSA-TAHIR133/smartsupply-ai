from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.services.model import DemandForecaster

router = APIRouter(prefix="/api/v1/forecast", tags=["Forecasting"])

class DailyUsage(BaseModel):
    date: str = Field(..., example="2026-09-01")
    quantity_used: int = Field(..., example=15)

class ForecastRequest(BaseModel):
    sku: str
    current_quantity: int
    forecast_days: int = Field(default=7, ge=1, le=30)
    usage_history: List[DailyUsage]

class ForecastResponse(BaseModel):
    tenant_id: str
    sku: str
    current_quantity: int
    forecast_days: int
    total_predicted_demand: int
    predicted_depletion_days: int
    daily_forecast: List[float]
    method: str

@router.post("/", response_model=ForecastResponse)
async def generate_forecast(
    request: ForecastRequest,
    x_tenant_id: str = Header(..., alias="x-tenant-id")
):
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="x-tenant-id header missing")

    history_data = [item.dict() for item in request.usage_history]
    
    forecast_result = DemandForecaster.predict_demand(
        history=history_data,
        forecast_days=request.forecast_days
    )

    total_demand = forecast_result["total_predicted_demand"]
    avg_daily = (total_demand / request.forecast_days) if request.forecast_days > 0 else 1
    depletion_days = int(request.current_quantity / avg_daily) if avg_daily > 0 else 999

    return ForecastResponse(
        tenant_id=x_tenant_id,
        sku=request.sku,
        current_quantity=request.current_quantity,
        forecast_days=request.forecast_days,
        total_predicted_demand=total_demand,
        predicted_depletion_days=depletion_days,
        daily_forecast=forecast_result["daily_forecast"],
        method=forecast_result["method"]
    )