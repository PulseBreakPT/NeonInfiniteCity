// Explicit, pure football law checks for the most frequent exceptional restarts.
// Based on IFAB Laws 8, 12, 13, 15, 16 and 17 (2026/27).
export const INDIRECT_RESTARTS=new Set(['offside','indirect','backpass']);
export function restartGoalVerdict(restartKind,takerSide,attackingSide,otherPlayerTouched=false){
 if(!restartKind||otherPlayerTouched)return 'goal';
 if(takerSide!==attackingSide)return 'corner';
 if(restartKind==='throwin'||INDIRECT_RESTARTS.has(restartKind))return 'goalkick';
 return 'goal';
}
export function goalkeeperHandlingAllowed(keeper,ball,half=1){
 if(keeper?.pos!=='GK')return false;
 const defendsFar=(keeper.side===0)===(![2,4].includes(half));
 const ownBox=defendsFar?ball.y>=105-16.5:ball.y<=16.5;
 if(!ownBox||ball.x<13.84||ball.x>54.16)return false;
 if(ball?.fromThrowin===keeper.side||ball?.deliberateBackpass===keeper.side)return false;
 return true;
}
export function isPenaltyArea(x,y,defendingSide,half=1){
 const defendsFar=(defendingSide===0)===(half!==2);
 return x>=13.84&&x<=54.16&&(defendsFar?y>=88.5:y<=16.5);
}
export function requiredDistance(kind){
 return kind==='throwin'?2:kind==='goalkick'?0:9.15;
}
export function directRestartOffsideExempt(kind){
 return kind==='throwin'||kind==='corner'||kind==='goalkick';
}
