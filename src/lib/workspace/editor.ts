import { WorkspaceProject } from './types';
export function updateWorkspace(p:WorkspaceProject,patch:Partial<WorkspaceProject>):WorkspaceProject{return {...p,...patch,revision:p.revision+1};}
export function moveScene(p:WorkspaceProject,id:string,offset:number){const scenes=[...p.scenes],i=scenes.findIndex(s=>s.id===id),j=i+offset;if(i<0||j<0||j>=scenes.length)return p;[scenes[i],scenes[j]]=[scenes[j],scenes[i]];return updateWorkspace(p,{scenes});}
