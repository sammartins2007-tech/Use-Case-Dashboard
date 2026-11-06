import json, re, sys
src = '/mnt/workspace/working/solext'
R = json.load(open(f'{src}/t_uc.json'))
KEEP = ['Title','Account','Pain','Process','Outcome','Stage','Products','MonthlyCostEUR','MonthlyValueEUR','FinOpsBasis','Owner','NextStep','FeatureUnlock','Confidence','Decision','Users','FunctionalFlow','DataSystems','Volumes','KPIs','OpenQuestions','Complexity','Effort','SizingBasis','Classification','ClassificationConfidence','ClassificationWhy','ClassificationNext','Flag','Discarded','DiscardReason','RelatedUseCases','InternalRef','Description','PotentialSolution','Readiness','KPIValues','SourceId','Wave','CustomerDecision','WaveSource','CustomerStatus','StartDate','TargetDate','PercentDone','RoadmapNote','Department','ValueLevel','ValueBasis','PriorityFit','PriorityWhy']
CH = {'Account','Stage','Confidence','Decision','Complexity','Effort','Classification','ClassificationConfidence','Department','ValueLevel','CustomerDecision'}
rows = []
for r in sorted(R, key=lambda r: int(r['_id'])):
    if r.get('Discarded'):
        continue
    o = {'ID': int(r['_id'])}
    for k in KEEP:
        v = r.get(k)
        if v in (None, ''):
            continue
        o[k] = {'Value': v, 'Id': 0} if k in CH and isinstance(v, str) else v
    rows.append(o)
c = json.load(open(f'{src}/t_cu.json'))[0]
cu = {k: c[k] for k in ('Title','HourlyRateUSD','RateNote','Waves','ReportTitle','ReportUrl','ReportYear','Headline','Priorities') if c.get(k) not in (None, '')}
cu['ID'] = 1; cu['HourlyRateUSD'] = float(cu.get('HourlyRateUSD', 50))
json.dump({'usecases_704f56': rows, 'customers_704f56': [cu], 'signals_704f56': [], 'featureradar_704f56': [], 'aiconsumption_704f56': []}, open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(rows), 'use cases')
