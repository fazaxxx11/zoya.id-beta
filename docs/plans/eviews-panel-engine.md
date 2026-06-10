# EViews Panel Data Engine — Future Plan

**Status:** Placeholder — not yet implemented.

## Overview

Extend Azezmen statistics engine with panel data estimation methods used in EViews/Gretl/STATA for cross-sectional time-series analysis.

## Planned Functions

### Core Estimators
| Function | Description | Reference |
|----------|-------------|-----------|
| `pooledOLS(data)` | Common Effect Model / Pooled Cross-Section | EViews Equation: Pooling method = None |
| `fixedEffects(data)` | Fixed Effect Model (dummy or within estimator) | EViews: Cross-section = Fixed |
| `randomEffects(data)` | Random Effect Model (GLS) | EViews: Cross-section = Random |
| `betweenEstimator(data)` | Between estimator (group means) | — |

### Diagnostic Tests
| Function | Description | Reference |
|----------|-------------|-----------|
| `chowTest(data)` | Pool stability test | EViews: Pool diagnostics → Chow |
| `hausmanTest(fe, re)` | Fixed vs Random selection | EViews: Pool diagnostics → Hausman |
| `breuschPaganLM(data)` | LM test for random effects | EViews: Pool diagnostics → LM |
| `lrTest(fe, pooled)` | Likelihood ratio test | — |

### Regression Diagnostics
| Function | Description | Reference |
|----------|-------------|-----------|
| `varianceInflationFactor(model)` | VIF for multicollinearity | EViews: Coefficient diagnostics → VIF |
| `durbinWatson(residuals)` | First-order autocorrelation | EViews: Durbin-Watson stat |
| `breuschPagan(model)` | Heteroskedasticity test | EViews: Heteroskedasticity → Breusch-Pagan |
| `whiteTest(model)` | Heteroskedasticity test (White) | EViews: Heteroskedasticity → White |
| `wooldridgeTest(model)` | Autocorrelation in panel data | — |

### Time Series (Later)
| Function | Description |
|----------|-------------|
| `adfTest(series)` | Augmented Dickey-Fuller unit root |
| `ppTest(series)` | Phillips-Perron unit root |
| `grangerCausality(x, y)` | Granger causality test |
| `cointegrationTest(x, y)` | Engle-Granger cointegration |
| `varModel(data)` | Vector autoregression |

## Data Structure

Panel data as array of objects with:
- `id`: cross-section identifier
- `time`: time period (numeric or string)
- One or more value columns

Example:
```javascript
const panelData = [
  { id: 'Firm1', year: 2020, revenue: 100, investment: 50 },
  { id: 'Firm1', year: 2021, revenue: 120, investment: 60 },
  { id: 'Firm2', year: 2020, revenue: 80, investment: 40 },
  ...
]
```

## Dependencies

No external dependencies — all implementations pure JavaScript, consistent with Phase 1 engine.

## Timeline

- **Phase 2**: Pooled OLS, Fixed Effects, Random Effects, Hausman
- **Phase 3**: Diagnostics (VIF, DW, BP, White)
- **Phase 4**: Time series (ADF, PP, Granger, VAR)
