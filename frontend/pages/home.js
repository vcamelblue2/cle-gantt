import {pass, none, smart, Use, f, Extended, Placeholder, Bind, RenderApp, toInlineStyle, LE_LoadScript, LE_LoadCss, LE_InitWebApp, LE_BackendApiMock, Alias} from "../libs/cle/lib/caged-le.js"
import { MainLayout } from "../layouts/main_layout.js"
import { Api } from "../api/backend_api.js"

import { NUM_DAYS, DAY_SIZE_PX, HEDADER_WIDTH, GRAPH_WIDTH } from "../settings/settings.js"

const SUBTASK_COLOR_MAPPING = {
	M: 'red',
	W: '#ff6b6b',
	D: "#00c80099",
	DEFAULT: "orange"
}

const getColorTask = (color)=>{
	return SUBTASK_COLOR_MAPPING[color] || SUBTASK_COLOR_MAPPING.DEFAULT
}

const getCalendar = (today_date = new Date(), num_days=NUM_DAYS, group_by_year_month=false)=>{
  const ONE_DAY = 24*60*60*1000

  let today_date_as_millis = today_date.getTime()
  let today_day = today_date.getDate()
  let first_day_as_millis = today_date_as_millis - ((today_day-1) * (ONE_DAY))
  let first_day_date = new Date(first_day_as_millis)

  let actual_date = first_day_date
  let result = []

  for (let i of [...Array(num_days).keys()]){
    result.push({date: actual_date, date_str: (actual_date.getFullYear()-2000) + "-" + (actual_date.getMonth()+1) + "-" + actual_date.getDate()})
    actual_date = new Date(actual_date.getTime()+ONE_DAY)
  }
  
  if (!group_by_year_month){
    return result
  }
  else {
    let groups = {}
    for (let res of result){
      let group_key = (res.date.getFullYear()-2000) + "-" + (res.date.getMonth()+1)
      if( group_key in groups){
        groups[group_key].push(res)
      }else{
        groups[group_key] = [res]
      }
    }
    return Object.entries(groups).map(([g,v])=>({month:g, days: v}))
  }
}


// $$ means sub app / new dynamic render
const $$GanttActivityEditor = ({parent, activity, onConfirm, onCancel, onDelete}={})=>({ div: {

  props: {
    parent: parent, 
    name: activity.name,
    color: activity.color,
    start: activity.start,
    len: activity.len,

    days: getCalendar(new Date("2022-06-01"), NUM_DAYS, false)
  },

  handle: { onclick: ($, evt) => { evt.stopPropagation(); onCancel() } },

  '':[

    { div: {

      handle: { onclick: ($, evt) => { evt.stopPropagation(); } },

      '': [

        { h5: { text: "Activity" }},
        { input: { 
          'ha.value': Bind($ => $.scope.name)
        }},

        { h5: { text: "Color" }},
        { input: { 
          'ha.value': Bind($ => $.scope.color)
        }},
        { div: { text: "", a_style: $=>({backgroundColor: $.scope.color, width: "40px", height: "20px"}) }},

        { h5: { text: "Start" }},
        { input: { 
          'ha.value': Bind($ => $.scope.start)
        }},
        { div: $=>"20"+$.scope.days[$.scope.start].date_str.replaceAll("-", "/")},

        { h5: { text: "Len" }},
        { input: { 
          'ha.value': Bind($ => $.scope.len)
        }},
        { div: $=>"20"+$.scope.days[parseInt($.scope.start)+parseInt($.scope.len)].date_str.replaceAll("-", "/")},

        { br: {}},
        { br: {}},

        { button: { text: "Cancel", handle: { onclick: $=>onCancel() }}},
        { button: { text: "Delete", handle: { onclick: $=>onDelete() }, meta: {if: $=>onDelete !== undefined}}},
        { button: { text: "Confirm", handle: { onclick: $=>onConfirm({name: $.scope.name, color: $.scope.color, start: $.scope.start, len: $.scope.len}) }}}
      ],

      a_style: `
        width: 50%;
        height: 90%;
        position: relative;
        background: white;
        top: 5%;
        left: 25%;
        border: 3px solid black;
        border-radius: 25px;
        padding: 25px;
      `,

    }}
    
  ],

  a_style: `
    width: 100%;
    height: 100%;
    position: fixed;
    background: #00000033;
    top: 0px;
    left: 0px;
    z-index: 9999;
  `,
  
}})
const openActivityEditor = $=>{

  let app;

  let onConfirm = (edits)=>{
    $.le.api.editActivity($.scope.project.id, $.scope.activity, edits)
    app.destroy()
    app = undefined
  }
  let onCancel = ()=>{
    app.destroy()
    app = undefined
  }
  let onDelete = ()=>{
    $.le.api.deleteActivity($.scope.project.id, $.scope.activity.id)
    app.destroy()
    app = undefined
  }
  app = RenderApp(document.body, $$GanttActivityEditor({parent: $.this, activity: $.scope.activity, onConfirm: onConfirm, onCancel: onCancel, onDelete: onDelete}))
}


// $$ means sub app / new dynamic render
const $$GanttSubTaskEditor = ({parent, subtask, onConfirm, onCancel, onDelete}={})=>({ div: {

  props: {
    parent: parent, 
    idx: subtask.idx,
    name: subtask.name,
    description: subtask.description,

    newIdx: subtask.idx,
    position: Alias($=>$.this.newIdx/DAY_SIZE_PX, ($,v)=>{$.this.newIdx=v*DAY_SIZE_PX})
  },

  handle: { onclick: ($, evt) => { evt.stopPropagation(); onCancel() } },

  '':[

    { div: {

      handle: { onclick: ($, evt) => { evt.stopPropagation(); } },

      '': [

        { h5: { text: "SubTask" }},
        { input: { 
          'ha.value': Bind($ => $.scope.name)
        }},

        { h5: { text: "Position" }},
        { input: { 
          'ha.value': Bind($ => $.scope.position)
        }},

        { h5: { text: "Description" }},
        { textarea: { 
          'ha.value': Bind($ => $.scope.description),  a_style: "height: 150px"
        }},
        { br: {}},
        { br: {}},

        { button: { text: "Cancel", handle: { onclick: $=>onCancel() }}},
        { button: { text: "Delete", handle: { onclick: $=>onDelete() }, meta: {if: $=>onDelete !== undefined}}},
        { button: { text: "Confirm", handle: { onclick: $=>onConfirm({idx: $.scope.idx, newIdx: $.scope.newIdx, name: $.scope.name, description: $.scope.description}) }}}
      ],

      a_style: `
        width: 60%;
        height: 70%;
        position: relative;
        background: white;
        top: 15%;
        left: 20%;
        border: 3px solid black;
        border-radius: 25px;
        padding: 25px;
      `,

    }}
    
  ],

  a_style: `
    width: 100%;
    height: 100%;
    position: fixed;
    background: #00000033;
    top: 0px;
    left: 0px;
    z-index: 9999;
  `,
  
}})
const openSubTaskEditor = $=>{

  let app;

  let onConfirm = (edits)=>{
    $.le.api.editSubTask($.scope.project.id, $.scope.activity, $.scope.subtask, edits, true)
    app.destroy()
    app = undefined
  }
  let onCancel = ()=>{
    app.destroy()
    app = undefined
  }
  let onDelete = ()=>{
    $.scope.subtasks = $.scope.subtasks.filter(s=>s.idx!==$.scope.subtask.idx)
    $.le.api.editSubTasks($.scope.project.id, $.scope.activity, $.scope.activity.subtasks, true)
    app.destroy()
    app = undefined
  }
  app = RenderApp(document.body, $$GanttSubTaskEditor({parent: $.this, subtask: $.scope.subtask, onConfirm: onConfirm, onCancel: onCancel, onDelete: onDelete}))
}


const GanttRowActivityHeader = { div: {
  let_buttons_visible: false,

  handle_onmouseenter: $=>{
    $.this.buttons_visible = true
  },
  handle_onmouseleave: $=>{
    $.this.buttons_visible = false
  },

  '': [
    { span: { 
      '': [
        
        { span: { 

          def_openActivityEditor: openActivityEditor,

          handle_onclick: $=>$.this.openActivityEditor(),

          text: f`@activity.name`, 
          a_style: "overflow-y: auto; max-width: "+(2*HEDADER_WIDTH/3)+"px; overflow-wrap: anywhere; display: inline-table;"
        }},

        { span: {   meta: { if: f`@buttons_visible`},

          '': [

            { button: {

              text: "-",

              handle_onclick: async $=> await $.le.api.decrementActivityLen($.scope.project.id, $.scope.activity),

              a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }},

            { button: {

              text: "<",

              handle_onclick: async $=> await $.le.api.moveActivityLeft($.scope.project.id, $.scope.activity),

              a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }},

            { button: {

              text: "^",

              handle_onclick: async $=> await $.le.api.moveActivityUp($.scope.project.id, $.scope.activity_idx),

              a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }},

            { button: {

              text: "v",

              handle_onclick: async $=> await $.le.api.moveActivityDown($.scope.project.id, $.scope.activity_idx),

              a_style: "width: 25px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }},

            { button: {

              text: ">",

              handle_onclick: async $=> await $.le.api.moveActivityRight($.scope.project.id, $.scope.activity),

              a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }},

            { button: {

              text: "+",

              handle_onclick: async $=> await $.le.api.incrementActivityLen($.scope.project.id, $.scope.activity),

              a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }},
          
          ]
        }}

      ],

      a_style: "display: flex; justify-content: space-between;", 

    }}
  ],

  a_style: "width: "+HEDADER_WIDTH+"px; display: inline-block"

}}
const GanttRowActivityGraph = { div: {

  def_completeMoove: async $=>{
    let new_start =  Math.max(0, $.scope.activity.start+ Math.round($.this.tmp_offset/DAY_SIZE_PX))
    await $.le.api.editActivity($.scope.project.id, $.scope.activity, {...$.scope.activity, start: new_start})
  },

  let_tmp_offset: 0,
  let_drag_enabled: false,
  let_has_edits: false,
  let_initial_X: 0,
  let_latest_offset: 0,
  handle_onmousedown: ($, e)=>{$.this.tmp_offset=0; $.this.latest_offset=0; $.this.initial_X=e.screenX; $.this.has_edits=false; $.this.drag_enabled=true},
  handle_onmouseup: $=>{$.this.latest_offset = $.this.tmp_offset; $.this.drag_enabled=false; $.this.has_edits && $.this.completeMoove()},
  handle_onmouseleave: $=>{if ($.this.drag_enabled){$.this.latest_offset = $.this.tmp_offset; $.this.drag_enabled=false; $.this.has_edits && $.this.completeMoove()}},
  handle_onmousemove: ($, e)=>{
    if($.this.drag_enabled){
      let new_offset = $.this.latest_offset + e.screenX - $.this.initial_X
      if (new_offset !== $.this.tmp_offset && Math.abs(new_offset) > 10){
        $.this.tmp_offset = new_offset
        $.this.has_edits = true
      }
      // console.log(Math.floor($.this.tmp_offset/DAY_SIZE_PX))
    }
  },


  let_subtasks: Alias($=>$.scope.activity.subtasks, ($,v)=>{$.scope.activity.subtasks=v}),
  let_subtask_position: DAY_SIZE_PX,

  def_addOrRemoveSubtask: ($, idx, isMilestone=false)=>{
    let subtask = $.this.subtasks.find(s=>s.idx===idx)
    if ( subtask !== undefined){ // remove
      if (subtask.description.length === 0  || (subtask.description.length > 0 && prompt("Are you sure you want to delete subtask? description says: "+subtask.description+". (Y/N)", "Y/N")==="Y"))
      $.this.subtasks = $.this.subtasks.filter(s=>s.idx!==idx)
    }
    else {
      $.this.subtasks = [...$.this.subtasks, {idx: idx, name: isMilestone ? "M" : "T", description: ""}] // add
    }
    console.log("removing", idx, subtask)
    // $.scope.activity.subtasks = $.this.subtasks // in caso di no alias..mettere poi false in api qui.. 
    $.le.api.editSubTasks($.scope.project.id, $.scope.activity, $.scope.activity.subtasks, true)
  },

  handle_onclick: ($, e)=>{
    console.log(e)
    if(!$.this.has_edits){
      $.this.addOrRemoveSubtask(Math.floor((e.clientX-$.this.el.getBoundingClientRect().left)/DAY_SIZE_PX)*DAY_SIZE_PX, e.metaKey || e.altKey || e.ctrlKey)
    }
  },

  '': [

    { span: { 

      def_openActivityEditor: openActivityEditor,

      handle_onclick: ($, e)=>{ e.stopPropagation(); $.this.openActivityEditor()},

      text: f`@activity.name`, 

      a_style: "top: -23px; position: absolute; color: black; font-weight: 700;"
    }},

    { div: { meta: { forEach: "subtask", of: f`@subtasks`},

      handle_oncontextmenu: ($,e)=>{
        if(!$.scope.has_edits){
          $.scope.addOrRemoveSubtask(Math.floor((e.clientX-$.parent.el.getBoundingClientRect().left)/DAY_SIZE_PX)*DAY_SIZE_PX, e.metaKey || e.altKey || e.ctrlKey)
        }
        e.preventDefault();
        return false;
      },
          
      handle_onclick: ($, e)=>{
        console.log(e)
        openSubTaskEditor($)
        e.stopPropagation()
      },

      handle_onmouseover: $ => {
        $.le.popover_service.show($.scope.subtask.description)
      },
      handle_onmouseout: $ => {
        $.le.popover_service.hide()
      },

      text: f`@subtask.name`,

      a_style: $=>({
        width: DAY_SIZE_PX+"px",
        height: "30px", 
        marginLeft: ($.scope.subtask.idx+(Math.ceil($.scope.subtask.idx/DAY_SIZE_PX)/30*0.5)) + "px", 
        position: "absolute", 
        top: "0px", 
        padding: "4px", 
        backgroundColor: getColorTask($.scope.subtask.name),
        textAlign: "center"
      })
    }}
  ],

  a_style: $=>({
    marginLeft: ($.this.tmp_offset + $.scope.activity.start * DAY_SIZE_PX + Math.ceil($.scope.activity.start/30*0.5)+1) + "px", // for the header row
    width: ($.scope.activity.len*DAY_SIZE_PX + Math.ceil($.scope.activity.start/30*0.5)+1)+"px",
    height: "30px",
    display: "inline-block",
    backgroundColor: $.scope.activity.color || "green",
    color: "white",
    textAlign: "center",
    // overflow: "auto",
    userSelect: "none",
    position: "relative"
  })

}}
const GanttRow = { div: {   meta: {forEach: "activity", of: f`@activities || []`, define: {index: "activity_idx", first: "isFirst", last: "isLast"}},

  '': [
    GanttRowActivityHeader,
    GanttRowActivityGraph
  ],

  a_style: $=>({
    width: "100%",
    // height: $.meta.isLast ? "40px" : "30px",
    display: "flex",
    alignItems: "center",
    // marginBottom: "10px",
    borderTop: "0.5px solid black",
    borderBottom: $.meta.isLast ? "0.5px solid black" : "none",
    paddingTop: "25px",
    paddingBottom: "5px",
  })

}}
const GanttRows  = { div: {

  '': [
    GanttRow,

    { button: {

      text: "Add",

      def_openActivityCreator: $=>{
        let app;

        let onConfirm = (edits)=>{
          $.le.api.addActivity($.scope.project.id, edits.name, edits.color, edits.start, edits.len)
          app.destroy()
          app = undefined
        }
        let onCancel = ()=>{
          app.destroy()
          app = undefined
        }
        app = RenderApp(document.body, $$GanttActivityEditor({parent: $.this, activity: {name: "New..", color: "green", start: 0, len: 5}, onConfirm: onConfirm, onCancel: onCancel}))
      },
      handle_onclick: $=>$.this.openActivityCreator(),

      a_style: "width: "+(HEDADER_WIDTH-5)+"px; margin-top: 5px"
    }}
  ],

  a_style: "width: 100%; display: block; padding-top: 55px; position: relative"
}}


const GanttHeader = { div: {    meta: { if: $=>$.scope.project!==undefined},
  '': [

    { div: {
      text: f`@project?.name`,
      a_style: "width: "+HEDADER_WIDTH+"px; heigth: 100%; display: inline-block; font-weight: 600; font-size: 1.9rem",
    }},
    
    // { div: {   meta: {forEach: "day", of: $=>getCalendar(new Date($.scope.project?.startDate), NUM_DAYS)},

    //   text: f`@day.date.getDate()`,

    //   a_style: "width: "+DAY_SIZE_PX+"px; height: 100%; display: inline-block; font-size: 10px; border-left: 1px dashed #00000055",
    // }},
    
    { div: {   meta: {forEach: "month", of: $=>getCalendar(new Date($.scope.project?.startDate), NUM_DAYS, true)},

      '': [
        { div: {
          text: f`20+@month.month`,

          a_style: "text-align: center"
        }},

        { div: {    meta: {forEach: "day", of: f`@month.days`},
        
          text: f`@day.date.getDate()`,

          a_style: $=>({
            width: DAY_SIZE_PX+"px",
            height: "100%",
            display: "inline-block",
            fontSize: "9px",
            borderLeft: $.scope.today === $.scope.day.date_str ? "2px solid orange" : "0.5px dashed #00000055",
            color: ([0,6].includes($.scope.day.date.getDay()) ? 'orange' : 'black'),
            fontWeight: $.scope.today === $.scope.day.date_str ? "900" : "unset",
            backgroundColor: ([0,6].includes($.scope.day.date.getDay()) ? '#eeeeee' : 'white')
          }),
        }}

      ],

      a_style: "height: 100%; display: inline-block; border-left: 0.5px solid #00000055",

    }}

  ],
  a_style: "width: "+GRAPH_WIDTH+"px; height: 100vh; display: block; position: absolute;"
}}


const Gantt = { div: {

  let_activities: $=>($.scope.project?.activities || []),

  on_this_activitiesChanged: $=>{
    console.log("activites changed!", $.this.activites)
  },

  '': [
    GanttHeader,
    GanttRows
  ],

  a_style: "width: "+GRAPH_WIDTH+"px"

}}

const PopOverService = { Controller: { meta: {hasViewChilds: true},
  id: "popover_service",

  let_content: undefined,
  let_timeout: undefined,

  def: {
    show: ($, text) => { 
      clearTimeout($.this.timeout)
      $.this.content = text 
    },
    hide: $ => { 
      clearTimeout($.this.timeout)
      $.this.timeout = setTimeout(()=>{ $.this.content = undefined}, 300) 
    },
  },
  

  view: 

    { div: { meta: {if: f`@content !== undefined`},

      a_style: "position: fixed; right: calc(50% - 20%); width: 40%; bottom: 25px; min-height: 80px; max-height: 600px; padding: 10px; z-index: 1000; background-color: white; border: 1px solid #aaaaaa;",

      '': {i: $ => $.scope.content.split("\n").join("; ") || "(Nothing To Show)" }
    }}
}}


export const HomePage = async (state)=>{ return { 
  div: {

    id: "app",

    let_projects: undefined,
    let_project: undefined,
    let_today: (()=>{ let d = new Date; return (d.getFullYear()-2000) +"-"+ (d.getMonth()+1) +"-"+ (d.getDate())})(),

    '':[
      
      Api,

      MainLayout({

        NavbarContents:[
          { span: { text: "Gantt Chart", a_style: "font-size: 1.9rem; margin-left: 15px; margin-right: 15px;" }}
        ], 

        SidebarComponents:[
          { div: {
            a_style: "width: 200px", 
            '': [
            { h4: "Projects"},
            { h5: {   meta: { forEach: "proj", of: f`@projects || []`},
              text: f`'- '+@proj.name`,
              a_style: "margin-left: 25px"
            }},
            { button: {text: "Reload Data", h_onclick: $=>$.le.api.forceReloadData(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            { button: {text: "Execute Backup Now", h_onclick: $=>$.le.api.storeBackup(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 10px; padding: 10px;color: #dddddd; cursor: pointer;"}}

            ]
          }}
        ], 

        MainContentComponents:[
          Gantt
        ]

      }),

      PopOverService,


      // CSS overwriter 
      { Css: { css: [
        '.grid-layout {grid-template-columns: auto auto auto auto auto auto;} ',
        '.navbar {position: sticky; top: 0px; z-index: 1000; }'
      ]}}

    ],

    attrs: { style: "width: 100%; height: 100%; padding: 0px; margin: 0px;" },
    css: [ `* { box-sizing: border-box !important;} body { padding: 0px; margin: 0px; }` ],

}}}

// -per avere subactivity senza ricorsione: li metto tutti come activity, magari con link al parent id, ma soprattutto costruisco "l'indice" come numero molto grande (tipo ragionamento a bit) es: 100 (parent), 110 (1st child), 111 (1st subchild)..poi ordino prima di mostrare..
// potrei anche costruire indice come Array.apply.tanto mi basta metterli vicino e fare un padEnd.. una cosa intelligente sarebbe andare a botte di 2 cifre: l''es di prima diventa: [01,00,00] (parent), [01, 01, 00] (1st child), [01, 01, 01] (1st subchild)
// il parent deve poi mantenere il "master index", ovvero quello manuale scelto dall''utente, per riordinare in blocco!

// -per ogni subtask posso aprire finestra day con 4 blocchi da 2h (anche in fila) o 8 da 1h, clickando sull''header invece si vede giorno completo.

// -modificare grafica, con subtask sotto la barra, nome sopra (basta togliere overflow , aumentare padding, e top più alto)