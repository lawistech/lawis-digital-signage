import{a as C}from"./chunk-6VCTTBHM.js";import{a}from"./chunk-WBRTOA2C.js";import{A as u,K as d,M as f,O as g,R as b,W as w,j as o,k as m,l as i,o as c}from"./chunk-URYE4ZYK.js";import{i as p}from"./chunk-ODN5LVDJ.js";var _=(()=>{class h{constructor(e){this.authService=e,this.areasCache$=null,this.realtimeChannels=new Map}getAreas(e=!1){if(this.areasCache$&&!e)return this.areasCache$;let t=this.authService.getCurrentUser()?.id;return t?(this.areasCache$=o(a.from("areas").select(`
          *,
          screens (
            id,
            name,
            status,
            last_ping,
            resolution,
            orientation
          )
        `).eq("user_id",t).order("created_at",{ascending:!1})).pipe(c(({data:r,error:s})=>{if(s)throw s;return this.mapAreasFromSupabase(r||[])}),u(r=>(console.error("Error fetching areas:",r),this.areasCache$=null,i(()=>r))),d({bufferSize:1,refCount:!0,windowTime:3e4})),this.areasCache$):i(()=>new Error("User not authenticated"))}getAreaById(e){return o(a.from("areas").select(`
          *,
          screens (
            id,
            name,
            status,
            resolution,
            orientation,
            last_ping,
            current_playlist,
            location,
            tags
          ),
          playlists:screens(id, current_playlist) /* This gets playlists indirectly */
        `).eq("id",e).single()).pipe(c(({data:t,error:r})=>{if(r)throw r;return this.mapAreaFromSupabase(t)}),u(t=>(console.error(`Error fetching area ${e}:`,t),i(()=>t))))}createArea(e){let t=this.authService.getCurrentUser()?.id;if(!t)return i(()=>new Error("User not authenticated"));let r={name:e.name,description:e.description,location:e.location,status:"active",user_id:t,screen_count:e.screenIds?.length||0,stats:{onlineScreens:0,totalScreens:e.screenIds?.length||0,activePlaylist:"No playlist",uptime:"99.9%",lastUpdated:new Date().toISOString()}};return o(a.from("areas").insert([r]).select().single()).pipe(c(({data:s,error:n})=>{if(n)throw n;this.areasCache$=null;let l=this.mapAreaFromSupabase(s);return e.screenIds?.length&&this.assignScreensToArea(l.id,e.screenIds).subscribe(),l}),u(s=>(console.error("Error creating area:",s),i(()=>s))))}updateArea(e,t){let r={name:t.name,description:t.description,location:t.location,status:t.status};return t.stats&&(r.stats=t.stats),o(a.from("areas").update(r).eq("id",e).select().single()).pipe(c(({data:s,error:n})=>{if(n)throw n;return this.areasCache$=null,this.mapAreaFromSupabase(s)}),u(s=>(console.error(`Error updating area ${e}:`,s),i(()=>s))))}deleteArea(e,t=!0){return o(a.from("areas").select("id").eq("id",e).single()).pipe(c(({data:r,error:s})=>{if(s)throw s;return r}),g(()=>p(this,null,function*(){t&&(yield a.from("screens").update({area_id:null}).eq("area_id",e))})),f(()=>o(a.from("areas").delete().eq("id",e))),c(({error:r})=>{if(r)throw r;this.areasCache$=null}),u(r=>(console.error(`Error deleting area ${e}:`,r),i(()=>r))))}subscribeToUpdates(e){let t=this.authService.getCurrentUser()?.id;if(!t)throw new Error("User not authenticated");let r=`area-updates-${t}`;if(this.realtimeChannels.has(r))return this.realtimeChannels.get(r);let s=a.channel(r).on("postgres_changes",{event:"*",schema:"public",table:"areas",filter:`user_id=eq.${t}`},n=>p(this,null,function*(){if(n.eventType==="DELETE"){this.areasCache$=null;return}if(n.new)try{let{data:l,error:S}=yield a.from("areas").select(`
                  *,
                  screens (
                    id,
                    name,
                    status,
                    last_ping,
                    resolution,
                    orientation
                  )
                `).eq("id",n.new.id).single();!S&&l&&(e(this.mapAreaFromSupabase(l)),this.areasCache$=null)}catch(l){console.error("Error in realtime update:",l)}})).subscribe();return this.realtimeChannels.set(r,s),s}unsubscribeFromUpdates(e){a.removeChannel(e),this.realtimeChannels.forEach((t,r)=>{t===e&&this.realtimeChannels.delete(r)})}assignScreensToArea(e,t){return t.length?o(Promise.all(t.map(r=>a.from("screens").update({area_id:e}).eq("id",r)))).pipe(c(()=>{}),u(r=>(console.error(`Error assigning screens to area ${e}:`,r),i(()=>r)))):m(void 0)}mapAreasFromSupabase(e){return e.map(t=>this.mapAreaFromSupabase(t))}mapAreaFromSupabase(e){return{id:e.id,name:e.name,description:e.description,location:e.location,status:e.status||"inactive",screenCount:e.screen_count||0,lastUpdated:new Date(e.updated_at),stats:{onlineScreens:e.screens?.filter(t=>t.status==="online").length||0,totalScreens:e.screens?.length||0,activePlaylist:e.stats?.activePlaylist||"No playlist",uptime:e.stats?.uptime||"99.9%",lastUpdated:e.stats?.lastUpdated||e.updated_at},screens:(e.screens||[]).map(t=>({id:t.id,name:t.name,status:t.status||"offline",resolution:t.resolution||"1920x1080",lastPing:t.last_ping||"Never"}))}}static{this.\u0275fac=function(t){return new(t||h)(w(C))}}static{this.\u0275prov=b({token:h,factory:h.\u0275fac,providedIn:"root"})}}return h})();export{_ as a};
