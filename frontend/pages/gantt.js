import {cle, pass, none, smart, Use, f, fArgs, Extended, Placeholder, Bind, RenderApp, toInlineStyle, LE_LoadScript, LE_LoadCss, LE_InitWebApp, LE_BackendApiMock, Alias} from "../libs/cle/lib/caged-le.js"
import {Router} from "../libs/cle/routing/lite_routing.js"

import { MainLayout } from "../layouts/main_layout.js"
import { RoutingButtonLink } from "../components/routing-button.component.js"
import { Api, pywebviewReady } from "../api/backend_api.js"

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
const $$GanttActivityEditor = ({parent, projectStartDate, activity, onConfirm, onCancel, onDelete}={})=>({ div: {

  props: {
    parent: parent, 
    name: activity.name,
    color: activity.color,
    start: activity.start,
    len: activity.len,

    days: getCalendar(new Date(projectStartDate), NUM_DAYS, false)
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
          'ha.type': 'color',
          'a.value': Bind($ => $.scope.color)
        }},
        { input: { 
          'a.value': Bind($ => $.scope.color)
        }},
        // { div: { text: "", a_style: $=>({backgroundColor: $.scope.color, width: "40px", height: "20px"}) }},

        { h5: { text: "Start" }},
        { input: { 
          'ha.value': Bind($ => $.scope.start), a_type: 'number'
        }},
        { div: {text: $=>"From: 20"+$.scope.days[$.scope.start].date_str.replaceAll("-", "/"), style: 'font-weight: 600'}},

        { h5: { text: "Len" }},
        { input: { 
          'ha.value': Bind($ => $.scope.len), a_type: 'number'
        }},
        { div: {text: $=>"To: 20"+$.scope.days[parseInt($.scope.start)+parseInt($.scope.len)].date_str.replaceAll("-", "/"), style: 'font-weight: 600'}},

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
  app = RenderApp(document.body, $$GanttActivityEditor({parent: $.this, projectStartDate: $.scope.project?.startDate, activity: $.scope.activity, onConfirm: onConfirm, onCancel: onCancel, onDelete: onDelete}))
}


const TodosComponent = ()=>({ div: {

  props: {
    curr_idx: -1,
    curr_text: '',
    curr_done: false,
    curr_tags: '',
    curr_tags_converted: $ => $.this.curr_tags.split(',').filter(t=>t!=='').map(v=>v.trim()),
    curr_created_on: 0,
    curr_estimated: 0,
    curr_priority: undefined,
    curr_due_to: undefined,

    
    is_insert_bar_open: $ => $.scope.todos?.length === 0 ? true : false
  },

  def: {
    toggle_is_insert_bar_open($){
      $.is_insert_bar_open = !$.is_insert_bar_open
    },
  },

  on_this_curr_textChanged: $ => {
    $.scope.pending_todos_edits = $.scope.curr_text ? true : false
  },

  css: [`
    [type="checkbox"].reset-checkbox,
    [type="checkbox"].reset-checkbox:checked,
    [type="checkbox"].reset-checkbox:not(checked) {
      opacity: 1;
      position: relative;
      pointer-events: unset;
    }
    
    [type="checkbox"].reset-checkbox+span::before,
    [type="checkbox"].reset-checkbox+span::after,
    [type="checkbox"].reset-checkbox:checked+span::before,
    [type="checkbox"].reset-checkbox:checked+span::after {
      display: none;
    }
    
    [type="checkbox"].reset-checkbox+span:not(.lever) {
      padding-left: 10px;
    }
  `],

  '': [

    { div: {
      // id: "todolist",

      '': [
        { div: { meta: {forEach: 'todo', of: $=>$.scope.todos, define: {index: 'index'}},
          
          def_edit_current_todo($){
            $.scope.curr_idx = $.meta.index
            $.scope.curr_done = $.meta.todo.done
            $.scope.curr_text = $.meta.todo.text
            $.scope.curr_tags = $.meta.todo.tags.join(',')
            $.scope.curr_created_on = $.meta.todo.created_on
            $.scope.curr_estimated = $.meta.todo.estimated ?? 0
            $.scope.curr_priority = $.meta.todo.priority
            $.scope.curr_due_to = $.meta.todo.due_to

            !$.is_insert_bar_open && ($.is_insert_bar_open = true)
          },
          def_remove_current_todo($){
            $.scope.todos = $.scope.todos.filter(todo=>todo !== $.meta.todo)
          },

          style: 'display: flex;',

          '': [
            {input: { 
              ha: {type: "checkbox", checked: f`$.meta.todo?.done`},
              h_onchange: f`{ $.meta.todo.done = !$.meta.todo?.done }`,
              class: 'reset-checkbox', 'a_style': 'display: inline; margin-left: 0px; margin-right: 2px',
            }}, 

            {span: { text: $ => $.meta.todo.text, handle_onclick: $ => {
              $.scope.edit_current_todo()
              $.scope.remove_current_todo()
            }}},
            
            cle.span({style: 'flex: 1 1 auto'}),
            
            {span: { meta: {if: $ => $.meta.todo.estimated }, style: 'padding-right: 10px', '': [
              "(",{span: { text: $ => $.meta.todo.estimated ?? 0}},"d)",
            ]}},

            {span: { meta: {if: $ => $.meta.todo.tags?.length > 0}, style: 'padding-right: 10px', '': [
              "[",{span: { text: $ => $.meta.todo.tags}},"]",
            ]}},

            {span: { '': [
              {button: { handle_onclick: $ => {$.scope.remove_current_todo()}, text: 'x'}}
            ]}}
            
          ]
        }},

        { h6: { meta: {if: $ => $.scope.todos?.length === 0}, text: 'Nothing to do', style: 'color: #ccc'}}
      ]
    }},

    {br: {meta: {if: $ => $.scope.todos?.length !== 0}}},

    { div: {
      // id: "insert_edit_bar",

      a_style: "border: 1px solid #ccc; border-radius: 5px; padding: 10px;",

      def_add_todo($){
        const todo = {
          done: $.scope.curr_done, 
          text: $.scope.curr_text, 
          created_on: $.scope.curr_created_on, 
          tags: $.scope.curr_tags?.split(',').filter(t=>t!=='').map(v=>v.trim()) || [], 
          estimated: $.scope.curr_estimated ?? 0, 
          priority: $.scope.curr_priority, 
          due_to: $.scope.curr_due_to
        }

        if ($.scope.curr_idx === -1){
          $.scope.todos = [...$.scope.todos, todo]
        }
        else {
          const pre = $.scope.todos.slice(0, $.scope.curr_idx)
          const post = $.scope.todos.slice($.scope.curr_idx, $.scope.todos.length+1)
          $.scope.todos = [...pre, todo, ...post]
        }
        
        $.scope.curr_idx = -1
        $.scope.curr_done = false
        $.scope.curr_text = ''
        $.scope.curr_tags = ''
        $.scope.curr_created_on = 0
        $.scope.curr_estimated = 0
        $.scope.curr_priority = undefined
        $.scope.curr_due_to = undefined
      },

      '': [
        
        // { h6: { text: "Add" }},

        FlexSpacedRow({}, 
          { h6: { text: "Add", style: 'margin: 0px; cursor: pointer;',  onclick: $ => $.toggle_is_insert_bar_open() }},
          { button: { text: $ => $.is_insert_bar_open ? 'hide' : 'show', onclick: $ => $.toggle_is_insert_bar_open(), style:'height: 30px;'}}
        ),
        { div: { meta: {if: $ => $.is_insert_bar_open},

          '': [
            {input: {'ha.value': Bind($ => $.scope.curr_text), style: 'height: 35px', h_onkeypress: fArgs('e')`{ if(e.key === 'Enter') { e.preventDefault(); $.scope.add_todo() }}`}},
            
            FlexSpacedRow({},
              FlexCol({ flex: '2'},
                { h6: { text: "Tags", style: 'margin: 0px' }},
                { div: { style: 'display: inline-flex; width: 100%',  '': [
                  {input: {'ha.value': Bind($ => $.scope.curr_tags), a_style: "height: 35px; ", h_onkeypress: fArgs('e')`{ if(e.key === 'Enter') { e.preventDefault(); $.scope.add_todo() }}` }},
                ]}}
              ),
              FlexCol({ flex: '1'},
                { h6: { text: "Estimate dd", style: 'margin: 0px' }},
                
                { div: { style: 'display: inline-flex; width: 100%',  '': [
                  {input: {'ha.value': Bind($ => $.scope.curr_estimated), style: 'height: 35px; ', h_onkeypress: fArgs('e')`{ if(e.key === 'Enter') { e.preventDefault(); $.scope.add_todo() }}`}},
                  
                  {input: { 
                    ha: {type: "checkbox", checked: f`$.scope.curr_done`},
                    h_onchange: f`{ $.scope.curr_done = !$.scope.curr_done }`,
                    class: 'reset-checkbox', 'a_style': { display: 'inline; margin-left: 15px; margin-right: 15px'},
                  }}, 

                  {button: { handle_onclick: $ => {
                    $.scope.add_todo()
                  }, text: 'Add'}}
                ]}}
              ),
            ),
          ]
        }}

      ]
    }},
    
  ]
}})

const FlexSpacedRow = (style={}, ...content)=>{
  return { div: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', ...style}, '': content}}
}

const FlexCol = (style={}, ...content)=>{
  return { div: { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1', ...style}, '': content}}
}

// $$ means sub app / new dynamic render
const $$GanttSubTaskEditor = ({parent, projectStartDate, activityStartIndex, subtask, onConfirm, onCancel, onDelete}={})=>({ div: {

  props: {
    parent: parent, 
    idx: subtask.idx,
    name: subtask.name,
    description: subtask.description,
    todos: JSON.parse(JSON.stringify(subtask.todos ?? [])), // {done: false, text: '', created_on: 0, tags: ['vivi'], estimated: 1, priority: 10, due_to: 0},
    len: subtask.len || 1,

    newIdx: subtask.idx,
    position: Alias($=>$.this.newIdx/DAY_SIZE_PX, ($,v)=>{$.this.newIdx=v*DAY_SIZE_PX}),

    pending_todos_edits: false,
  },

  def_set_todos($, todos){
    $.this.todos = todos
  },

  clicked_here: false,
  handle: {  
    onmousedown: ($, evt) => {$.scope.clicked_here = true}, // fix exit on click started from editor pane
    onclick: ($, evt) => { evt.stopPropagation(); $.scope.clicked_here && onCancel();$.scope.clicked_here = false  } 
  },

  '':[

    { div: {
      // id: 'editor_pane_content',
      
      // fix exit on click started from editor pane
      handle: {onmousedown: ($, evt) => {evt.stopPropagation(); $.scope.clicked_here = false}, onclick: ($, evt) => { evt.stopPropagation(); } },
      days: getCalendar(new Date(projectStartDate), NUM_DAYS, false),

      '': [

        FlexSpacedRow({},
          FlexCol({},
            { h6: { text: "Type" }},
            { input: { 
              'ha.value': Bind($ => $.scope.name)
            }},
            { div: '[T,D,M]',}
          ),
          FlexCol({},
            { h6: { text: "Start" }},
            { input: { 
              'ha.value': Bind($ => $.scope.position), a_type: 'number'
            }},
            { div: {text: $=>"From: 20"+($.scope.days[parseInt($.scope.position)+parseInt(activityStartIndex)]?.date_str.replaceAll("-", "/") ?? ' - err'), style: 'font-weight: 600'}},
          ),
          FlexCol({},
            { h6: { text: "Duration" }},
            { input: { 
              'ha.value': Bind($ => $.scope.len), a_type: 'number'
            }},
            { div: {text: $=>"To: 20"+($.scope.days[parseInt($.scope.position)+parseInt(activityStartIndex)+parseInt($.scope.len)]?.date_str.replaceAll("-", "/") ?? ' - err'), style: 'font-weight: 600'}},
          ),
        ),

        { h5: { text: "Tasks" }},
        TodosComponent(),

        { h6: { text: "Notes" }},
        { textarea: { 
          'ha.value': Bind($ => $.scope.description),  a_style: "height: 125px"
        }},

        { br: {}},
        { br: {}},

        { div: { meta: {if: $ => $.scope.pending_todos_edits}, style:'color: red; font-weight: 600; margin-bottom: 10px', text: "Please, insert or discard to do to continue"}},
        { div: { style: $ =>({opacity: $.scope.pending_todos_edits ? 0.1 : null, pointerEvents:  $.scope.pending_todos_edits ? 'none' : null}), '': [
          { button: { text: "Cancel", handle: { onclick: $=>onCancel() }, style:'color: black; font-weight: 800;'}},
          { button: { text: "Delete", handle: { onclick: $=>onDelete() }, meta: {if: $=>onDelete !== undefined}, style:'color: red; font-weight: 600;'}},
          { button: { text: "Confirm", handle: { onclick: $=>onConfirm({idx: $.scope.idx, newIdx: $.scope.newIdx, name: $.scope.name, len: $.scope.len, description: $.scope.description, todos: $.scope.todos}) }, style:'color: green; font-weight: 800;'}}
        ]}}
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
        overflow-y: auto;
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
  app = RenderApp(document.body, $$GanttSubTaskEditor({parent: $.this, projectStartDate: $.scope.project?.startDate, activityStartIndex: $.scope.activity.start, subtask: $.scope.subtask, onConfirm: onConfirm, onCancel: onCancel, onDelete: onDelete}))
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
      $.this.subtasks = [...$.this.subtasks, {idx: idx, name: isMilestone ? "M" : "T", description: "", len: 1}] // add
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

  //show hide row here if tags filter

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
        const todos = $.scope.get_visible_todos()?.map(t=> '- ' + (t.done ? '[Done]' : '[To-Do]') + ' ' + t.text + ( t.estimated ? (' ['+t.estimated+'d] ') : '')+ ( t.tags?.length > 0 ? ('[' +t.tags?.join(', ')+']') : '') ).join('\n') || ''
        $.le.popover_service.show(todos + (todos + $.scope.subtask.description ? "\n" : '') + $.scope.subtask.description) // todo: better use array, filter '', join '\n'
      },
      handle_onmouseout: $ => {
        $.le.popover_service.hide()
      },

      let_is_visible: $ => {
        const selected = $.le.tags_filter.selected_tags
        if (selected.length === 0){
          return true
        }

        const tags = $.meta.subtask.todos?.flatMap(todo=>todo.tags) ?? []
        
        for (let tag of tags){
          if (selected.includes(tag)){
            return true
          }
        } 
        
        return false
      },
      
      def_get_visible_todos: $ => {
        const selected = $.le.tags_filter.selected_tags;
        const todos = $.meta.subtask.todos ?? []
        
        if (selected.length === 0){
          return todos
        } 
        else {
          const filtered_todos = todos.filter(todo => todo.tags.filter(tag => selected.includes(tag)).length > 0 )
          return filtered_todos
        }
      },

      text: f`@subtask.name`,

      a_style: $=>({
        width: (($.subtask.len || 1) * DAY_SIZE_PX)+"px",
        height: "30px", 
        marginLeft: ($.scope.subtask.idx+(Math.ceil($.scope.subtask.idx/DAY_SIZE_PX)/30*0.5)) + "px", 
        position: "absolute", 
        top: "0px", 
        padding: "4px", 
        backgroundColor: getColorTask($.scope.subtask.name),
        textAlign: "center",
        opacity: $.is_visible ? null : '0'
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
      let_in_rename: false,
      '': [
        { input: {   meta: { if: $ => $.in_rename },
          let_projName: Bind(`@project.name`),
          'ha.value': Bind(f`@projName`),
          style: 'width: calc(100% - 55px); margin-right: 5px;',
          h_onkeypress: ($, evt) => {if (evt.key === 'Esc') {$.in_rename = false}}
        }},
        { button: {   meta: { if: $ => $.in_rename },
          text: "Rename",
          h_onclick: async $ => {
            await $.le.api.renameProject($.project.id, $.project.name)
            $.in_rename = false
            Router.navigate("home", {projId: $.project.id}, false)
          },
          style: "width: 45px;font-size: 10px;height: 45px;"
        }}, 

        { span: {   meta: { if: $ => !$.in_rename },
          text: f`@project.name`, //  + '---' + @in_rename
          h_onclick: $ => { $.in_rename = true } 
        }}
      ],
      a_style: "width: "+HEDADER_WIDTH+"px; heigth: 100%; display: inline-block; font-weight: 600; font-size: 1.9rem; position: relative; z-index: 2",
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

      a_style: "position: fixed; right: calc(50% - 20%); width: 40%; bottom: 25px; min-height: 120px; max-height: 1000px; padding: 10px; z-index: 1000; background-color: white; border: 1px solid #aaaaaa;",

      '': {pre: { text: $ => $.scope.content || "(Nothing To Show)", style: $ => $.scope.content ? 'font-weight: 400; wrap-word; overflow-wrap: break-word; text-wrap: wrap;' : 'color: #ccc' }}
    }}
}}

const TagsFilterSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Tags"},
        { button: { onclick: $ => $.le.tags_filter.selected_tags = [], text: 'x'}}
      ),

      cle.div({
        id: "tags_filter",
        
        let:{
          selected_tags: [],
          filtering: $ => $.scope.selected_tags?.length !== 0
        },

        // on_this_selected_tagsChanged: $=>{console.log("selected tags changed", $.selected_tags)},

        on_scope_project_tagsChanged: $ => {
          if ($.scope.selected_tags?.length > 0){
            $.scope.selected_tags = $.scope.selected_tags?.filter(tag => $.scope.project_tags.includes(tag))
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected_tags, h_onchange: ($, e)=>{ $.scope.selected_tags = Array.from(e.target.selectedOptions).map(s=>s.value)}, class: "browser-default", a_multiple: true, style: 'min-height: 100px;'},
          cle.option({ meta: {forEach: 'tag', of: $ => $.scope.project_tags}, 
            ha_value: $=>$.tag, 
            ha_selected: $=>$.scope.selected_tags.includes($.tag), 
          }, $ => $.tag)
        )
      )
    )
  )
}

export const GanttPage = async (state)=>{ console.log("STATE:", state); return { 
  div: {

    id: "app",

    let_projects: undefined,
    let_project: undefined,
    let_project_tags: [],
    let_today: (()=>{ let d = new Date; return (d.getFullYear()-2000) +"-"+ (d.getMonth()+1) +"-"+ (d.getDate())})(),

    
    afterChildsInit: async $ => {
      await pywebviewReady
      
      console.log(pywebview)
      console.log(pywebview.api)
      console.log(Object.keys(pywebview.api))

      await $.le.api.getProjects()
      await $.le.api.getProject(state?.projId)
      console.log($.this.projects)
      console.log($.this.project)      
      await $.le.api.getProjectTags($.project.id);
    },

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
            { h5: {   meta: { forEach: "proj", of: f`@projects || []`, define: {index: "projIdx"}},
              text: [
                { span: { 
                  text: f`'- '+@proj.name`,
                  h_onclick: $ => { 
                    console.log("navigate to: ", $.proj); 
                    Router.navigate("home", {projId: $.proj.id}, false)
                  }
                }},
                { span: {   meta: { if: f`@projIdx  > 0` },
                  text: ' x', 
                  style: "color: red",
                  h_onclick: async $ => { 
                    console.log("remove proj: ", $.proj); 
                    await $.le.api.removeProject($.proj.id)
                    Router.navigate("home", undefined, true)
                  }
                }},
              ],
              a_style: "margin-left: 25px; cursor: pointer;"
            }},
            { button: {text: "Add New Project", h_onclick: async $=>{Router.navigate("home", {projId: await $.le.api.newProject()}, false)}, a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            { button: {text: "Reload Data", h_onclick: $=>$.le.api.forceReloadData(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            { button: {text: "Execute Backup Now", h_onclick: $=>$.le.api.storeBackup(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 10px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            { hr: {}},
            TagsFilterSelector(),
            { hr: {}},
            RoutingButtonLink("Open Shared Notes", $=>["notes", {projId: $.project.id}]),
            RoutingButtonLink("Open Shared Todolist", $=>["todolist", {projId: $.project.id}]),
            RoutingButtonLink("Open Personal Planner", $=>["planner", undefined]),
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