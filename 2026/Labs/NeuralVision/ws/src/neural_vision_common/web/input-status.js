// The drawing is an editable draft. A prediction belongs to its evaluated pixels.
export function inputStatus(draft,displayed,hasResult,pending=false) {
  if(pending)return {kind:'pending',text:hasResult?'Updating… showing the previous input.':'Computing this drawing…'};
  if(!hasResult)return {kind:'pending',text:'Waiting for this model’s prediction.'};
  if(draft.length!==displayed.length||draft.some((v,i)=>v!==displayed[i]))
    return {kind:'changed',text:'Drawing changed — update prediction.'};
  return {kind:'current',text:'Prediction matches this drawing.'};
}
