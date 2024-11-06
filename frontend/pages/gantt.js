import {cle, pass, none, smart, Use, f, fArgs, Extended, Placeholder, Bind, RenderApp, toInlineStyle, LE_LoadScript, LE_LoadCss, LE_InitWebApp, LE_BackendApiMock, Alias} from "../libs/cle/lib/caged-le.js"
import {Router} from "../libs/cle/routing/lite_routing.js"

import { MainLayout } from "../layouts/main_layout.js"
import { RoutingButtonLink } from "../components/routing-button.component.js"
import { Timer } from "../components/timer.component.js"
import { Api, pywebviewReady } from "../api/backend_api.js"

import { NUM_DAYS, DAY_SIZE_PX, HEDADER_WIDTH, GRAPH_WIDTH, ROW_HEIGHT } from "../settings/settings.js"

const green = '#008000'
const red = '#ff0000'

const SUBTASK_COLOR_MAPPING = {
	M: red,
	W: '#ff6b6b',
	D: "#00c80099",
  X: '#ccc',
	DEFAULT: "orange"
}

const getColorTask = (color, _default)=>{
	return SUBTASK_COLOR_MAPPING[color] || _default
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

const sort_todos = (todos)=>todos.toSorted((a,b)=>(a.done ? Number.MAX_SAFE_INTEGER : (a.due_to ?? Number.MAX_SAFE_INTEGER)) - (b.done ? Number.MAX_SAFE_INTEGER : (b.due_to ?? Number.MAX_SAFE_INTEGER))) // without a due to at the end


const ActivityCopyService = {
  current: undefined,

  copy: (activity)=>{
    ActivityCopyService.current = JSON.parse(JSON.stringify(activity))
    console.log(activity, "COPIED", ActivityCopyService.current)
  },
  paste: (scope) => {
    console.log("I WILL COPY:", ActivityCopyService.current)
    let cp = JSON.parse(JSON.stringify(ActivityCopyService.current))
    scope.name = cp.name
    scope.color = cp.color
    scope.subtasks_default_color = cp.subtasks_default_color
    scope.start = cp.start
    scope.len = cp.len
    scope.subtasks = cp.subtasks
  }
}
// $$ means sub app / new dynamic render
const $$GanttActivityEditor = ({is_new, parent, days, projectStartDate, activity, onConfirm, onCancel, onDelete}={})=>({ div: {

  props: {
    parent: parent, 
    name: activity.name,
    color: activity.color,
    subtasks_default_color: activity.subtasks_default_color,
    start: activity.start,
    len: activity.len,
    subtasks: activity.subtasks,

    days: days
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

        { h5: { text: "Default Task Color" }},
        { input: { 
          'ha.type': 'color',
          'a.value': Bind($ => $.scope.subtasks_default_color)
        }},
        { input: { 
          'a.value': Bind($ => $.scope.subtasks_default_color)
        }},

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

        { h5: { text: "Task" }},
        { div: {text: $=>$.subtasks?.length, style: 'font-weight: 600'}},

        { br: {}},
        { br: {}},
        FlexSpacedRow({}, 
          { div: { '': [
            { button: { text: "Cancel", handle: { onclick: $=>onCancel() }, style:'color: black; font-weight: 800;'}},
            { button: { text: "Delete", handle: { onclick: $=>onDelete() }, meta: {if: $=>onDelete !== undefined}, style:'color: red; font-weight: 600;'}},
            { button: { text: "Confirm", handle: { onclick: $=>onConfirm({name: $.scope.name, color: $.scope.color, start: $.scope.start, len: $.scope.len, subtasks_default_color: $.scope.subtasks_default_color, subtasks: $.scope.subtasks ?? [] }) }, style:'color: '+green+'; font-weight: 800;'}},
          ]}},
          { div: { '': [
            { button: { text: "Cut", handle: { onclick: $=>{ActivityCopyService.copy({ name: $.scope.name, color: $.scope.color, start: $.scope.start, len: $.scope.len, subtasks_default_color: $.scope.subtasks_default_color, subtasks: $.scope.subtasks ?? []}); onDelete()} }, style:'color: red; font-weight: 800;margin-right: 15px'}},
            { button: { text: "Copy", handle: { onclick: $=>ActivityCopyService.copy({ name: $.scope.name, color: $.scope.color, start: $.scope.start, len: $.scope.len, subtasks_default_color: $.scope.subtasks_default_color, subtasks: $.scope.subtasks ?? []}) }, style:'color: black; font-weight: 800;'}},
            { button: { text: "Paste", handle: { onclick: $=>ActivityCopyService.paste($.scope) }, style:'color: black; font-weight: 800;'}},
          ]}},
        )
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
        overflow-y: auto;
        resize: both;
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
  app = RenderApp(document.body, $$GanttActivityEditor({is_new: false, parent: $.this, days: $.scope.proj_days, projectStartDate: $.scope.project?.startDate, activity: $.scope.activity, onConfirm: onConfirm, onCancel: onCancel, onDelete: onDelete}))
}


const DRAG_DROP_LIST_ITEM_DIRECTIVE__ELEMENTS_CONTAINER_DEF = (/** @type ($, drop_target_$, evt, draggedIdx, droppedIdx) => any */swap, index_name='index', /** @type undefined | {set: ($, el) => any, remove: ($, el) => any} */custom_style_drop=undefined ) => {
  return { 
    def: {
      dragAndDrop:{
        // events on draggable items
        onDragStart($, drag_target_$, evt){
          // console.log("DRAG START")

          evt.dataTransfer.setData('idx', drag_target_$[index_name])

          drag_target_$.el.style.opacity = 0.5
          drag_target_$.el.style.backgroundColor = "white"
          
          evt.dataTransfer.setData('resetStyle', ()=>{
            drag_target_$.el.style.opacity = null
            drag_target_$.el.style.backgroundColor = null
          })
        },
        onDragEnd($, drag_target_$, evt){
          // console.log("DRAG END")
          setTimeout(() => {
            // evt.dataTransfer.getData("resetStyle")()
            drag_target_$.el.style.opacity = null
            drag_target_$.el.style.backgroundColor = null
          }, 100);
        },

        // events on droppable item
        onDragOver($, drop_target_$, evt){
          // console.log("DRAG OVER")
          // required to accept drop
          evt.preventDefault(); 
        },
        onDragEnter($, drop_target_$, evt){
          // console.log("DRAG ENTER")
          evt.preventDefault();

          // highlight border of drop element
          if(custom_style_drop) 
            custom_style_drop?.set(drop_target_$, drop_target_$.el)
          else
            drop_target_$.el.style.border = "1px solid black"
        },
        onDragLeave($, drop_target_$, evt){
          // console.log("DRAG LEAVE")
          evt.preventDefault();

          // remove highlight border of drop element
          if(custom_style_drop) 
            custom_style_drop?.remove(drop_target_$, drop_target_$.el)
          else
            drop_target_$.el.style.border = null
        },
        onDrop($, drop_target_$, evt){
          // console.log("DRAG DROP")
          evt.preventDefault();

          // console.log("DROP!!", evt.dataTransfer.getData("idx"), evt)

          let draggedIdx = parseInt(evt.dataTransfer.getData("idx"))
          let droppedIdx = drop_target_$[index_name]
          
          if (draggedIdx !== droppedIdx){
            swap($, drop_target_$, evt, draggedIdx, droppedIdx)
          }
          else {
            evt?.dataTransfer?.getData?.("resetStyle")?.()
          }
        }
      }
    }
  }
}
const DRAG_DROP_LIST_ITEM_DIRECTIVE__DRAGGABLE_ELEMENT_DEF = ()=>{
  return {
    a_draggable: "true",

    handle_ondragstart: ($, evt) => $.scope.dragAndDrop.onDragStart($, evt),
    handle_ondragend: ($, evt) => $.scope.dragAndDrop.onDragEnd($, evt),

    handle_ondragover: ($, evt) => $.scope.dragAndDrop.onDragOver($, evt),
    handle_ondragenter: ($, evt) => $.scope.dragAndDrop.onDragEnter($, evt),
    handle_ondragleave: ($, evt) => $.scope.dragAndDrop.onDragLeave($, evt),
    handle_ondrop: ($, evt) => $.scope.dragAndDrop.onDrop($, evt),
  }
}

const TodoCopyService = {
  current: undefined,

  copy: (todo)=>{
    TodoCopyService.current = JSON.parse(JSON.stringify(todo))
    console.log(todo, "COPIED", TodoCopyService.current)
  },
  paste: (scope) => {
    console.log("I WILL COPY:", TodoCopyService.current)
    let cp = JSON.parse(JSON.stringify(TodoCopyService.current))
    scope.curr_idx = -1
    scope.curr_done = cp.done
    scope.curr_text = cp.text
    scope.curr_tags = cp.tags.join(',')
    scope.curr_created_on = cp.created_on
    scope.curr_estimated = cp.estimated ?? 0
    scope.curr_priority = cp.priority
    scope.curr_due_to = cp.due_to ?? 0
  }
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
    curr_due_to: 0,

    
    is_insert_bar_open: $ => $.scope.todos?.length === 0 ? true : false
  },

  def: {
    toggle_is_insert_bar_open($){
      $.is_insert_bar_open = !$.is_insert_bar_open
    },
    
    open_insert_bar($){
      $.is_insert_bar_open = true
    },

    reset($){
      $.scope.curr_idx = -1
      $.scope.curr_done = false
      $.scope.curr_text = ''
      $.scope.curr_tags = ''
      $.scope.curr_created_on = 0
      $.scope.curr_estimated = 0
      $.scope.curr_priority = undefined
      $.scope.curr_due_to = 0
    }
    
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

    // TODO LIST
    { div: {
      // id: "todolist",

      ...DRAG_DROP_LIST_ITEM_DIRECTIVE__ELEMENTS_CONTAINER_DEF(
        // on swap:
        ($, drop_target_$, evt, draggedIdx, droppedIdx) => {
          evt.preventDefault();

          let draggedTodo = $.scope.todos[draggedIdx]
          let droppedTodo = $.scope.todos[droppedIdx]

          let reordered = $.scope.todos.filter(x=>x !== draggedTodo) // remove current drag
          reordered.splice(reordered.indexOf(droppedTodo) + (draggedIdx > droppedIdx ? 0 : 1), 0, draggedTodo) // swap drop/drag items
          
          $.scope.todos = [...reordered]
        }
      ),

      '': [
        { div: { meta: {forEach: 'todo', of: $=>$.scope.todos, define: {index: 'index'}},

          ...DRAG_DROP_LIST_ITEM_DIRECTIVE__DRAGGABLE_ELEMENT_DEF(),
          
          def_edit_current_todo($){
            $.scope.curr_idx = $.meta.index
            $.scope.curr_done = $.meta.todo.done
            $.scope.curr_text = $.meta.todo.text
            $.scope.curr_tags = $.meta.todo.tags.join(',')
            $.scope.curr_created_on = $.meta.todo.created_on
            $.scope.curr_estimated = $.meta.todo.estimated ?? 0
            $.scope.curr_priority = $.meta.todo.priority
            $.scope.curr_due_to = $.meta.todo.due_to ?? 0

            !$.is_insert_bar_open && ($.is_insert_bar_open = true)
          },
          def_remove_current_todo($){
            $.scope.todos = $.scope.todos.filter(todo=>todo !== $.meta.todo)
          },

          let_is_visible: $ => {
            const selected_by_tags = $.scope.cp_tags_filter.selected;
            const selected_by_status = $.scope.cp_tags_status_filter.selected;
            const selected_by_due_to = $.scope.cp_due_to_filter.selected;
            
            if (selected_by_tags.length === 0 && selected_by_status.length === 0 && selected_by_due_to === 'All'){
              return true
            } 

              for (let tag of $.scope.todo.tags){
                if ((selected_by_tags.length === 0 || (selected_by_tags.length > 0 && selected_by_tags.includes(tag))) && 
                    (selected_by_status.length === 0 || (selected_by_status.length > 0 && selected_by_status.includes($.scope.todo.done ? 'Done' : 'To-Do'))) &&
                    (selected_by_due_to === 'All' || (selected_by_due_to === 'Planned' && $.scope.todo.due_to > 0 ) || (selected_by_due_to === 'Not Planned' && ($.scope.todo.due_to <= 0 || $.scope.todo.due_to === undefined) )) ){
                  return true
                }
            }
            
            return false
          },

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

            {span: { meta: {if: $ => ($.meta.todo.due_to ?? 0) > 0 }, style: 'padding-right: 10px', '': [
              "[",{ span: {text: $=>"20"+($.scope.days[parseInt($.scope.position)+parseInt($.scope.activityStartIndex) + parseInt($.meta.todo.due_to ?? 0)-1]?.date_str.replaceAll("-", "/") ?? ' - err'), }},"]",
            ]}},

            {span: { meta: {if: $ => $.meta.todo.tags?.length > 0}, style: 'padding-right: 10px', '': [
              "[",{span: { text: $ => $.meta.todo.tags}},"]",
            ]}},

            {span: { '': [
              {button: { handle_onclick: $ => {TodoCopyService.copy($.meta.todo)}, text: 'copy'}},
              {button: { handle_onclick: $ => {TodoCopyService.copy($.meta.todo); $.scope.remove_current_todo()}, text: 'cut'}},
              {button: { handle_onclick: $ => {$.scope.remove_current_todo()}, text: 'x'}}
            ]}}
            
          ],

          style: $ => ({
            display: 'flex',
            opacity: $.scope.is_visible ? 1 : 0.3
          }),
        }},

        { h6: { meta: {if: $ => $.scope.todos?.length === 0}, text: 'Nothing to do', style: 'color: #ccc'}}
      ]
    }},

    {br: {meta: {if: $ => $.scope.todos?.length !== 0}}},

    // INSERT PANEL
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
          due_to: $.scope.curr_due_to ?? 0
        }

        if ($.scope.curr_idx === -1){
          $.scope.todos = [...$.scope.todos, todo]
        }
        else {
          const pre = $.scope.todos.slice(0, $.scope.curr_idx)
          const post = $.scope.todos.slice($.scope.curr_idx, $.scope.todos.length+1)
          $.scope.todos = [...pre, todo, ...post]
        }
        
        $.reset()
      },

      '': [
        
        // { h6: { text: "Add" }},

        FlexSpacedRow({}, 
          { h6: { text: "Add", style: 'margin: 0px; cursor: pointer;',  onclick: $ => $.toggle_is_insert_bar_open() }},
          { div: {
            '': [
              { button: { meta: {if: $ => $.is_insert_bar_open}, handle_onclick: $ => {$.reset()}, text: 'Clear', style:'height: 30px;'}},
              { button: { handle_onclick: $ => {TodoCopyService.paste($.scope); $.open_insert_bar()}, text: 'Paste', style:'height: 30px;'}},
              { button: { text: $ => $.is_insert_bar_open ? 'hide' : 'show', onclick: $ => $.toggle_is_insert_bar_open(), style:'height: 30px;'}}
            ]
          }}
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
                { h6: { style: 'margin: 0px', text: [
                  "Due To dd ",
                  "(",
                  {span: { meta: {if: $ => ($.scope.curr_due_to ?? 0) > 0 }, style: 'padding-left: 5px; font-weight: 600', '': [
                    { span: {text: $=>"20"+($.scope.days[parseInt($.scope.position )+parseInt($.scope.activityStartIndex) + parseInt($.scope.curr_due_to ?? 0)-1]?.date_str.replaceAll("-", "/") ?? ' - err'), }},
                  ]}},
                  ")"  
                ]}},
                { div: { style: 'display: inline-flex; width: 100%',  '': [
                  {input: {a_type: 'number',a_min: 0, a_max: $ => $.scope.len, 'ha.value': Bind($ => $.scope.curr_due_to), style: 'height: 35px; ', h_onkeypress: fArgs('e')`{ if(e.key === 'Enter') { e.preventDefault(); $.scope.add_todo() }}`}},
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

                  {button: { 
                    style: $ => $.scope.pending_todos_edits ? 'color: red' : null,
                    handle_onclick: $ => {
                      $.scope.add_todo()
                    }, 
                    text: 'Add'
                  }}
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

const SubtaskCopyService = {
  current: undefined,

  copy: (task)=>{
    SubtaskCopyService.current = JSON.parse(JSON.stringify(task))
    console.log(task, "COPIED", SubtaskCopyService.current)
  },
  paste: (scope) => {
    console.log("I WILL COPY:", SubtaskCopyService.current)
    let cp = JSON.parse(JSON.stringify(SubtaskCopyService.current))
    scope.name = cp.name
    scope.description = cp.description
    scope.custom_color = cp.custom_color
    scope.todos = cp.todos
    scope.len = cp.len
  }
}

// $$ means sub app / new dynamic render
const $$GanttSubTaskEditor = ({$parent, days, projectStartDate, activityStartIndex, subtask, onConfirm, onCancel, onDelete}={})=>({ div: {

  props: {
    parent: $parent.parent, 
    projectStartDate: projectStartDate,
    activityStartIndex: activityStartIndex,
    idx: subtask.idx,
    name: subtask.name,
    description: subtask.description,
    custom_color: subtask.custom_color ?? '',
    todos: JSON.parse(JSON.stringify(subtask.todos ?? [])), // {done: false, text: '', created_on: 0, tags: ['vivi'], estimated: 1, priority: 10, due_to: 0},
    len: subtask.len || 1,

    newIdx: subtask.idx,
    position: Alias($=>$.this.newIdx/DAY_SIZE_PX, ($,v)=>{$.this.newIdx=v*DAY_SIZE_PX}),

    pending_todos_edits: false,

    days: days,
    
    cp_tags_filter: $parent.le.tags_filter,
    cp_tags_status_filter: $parent.le.tags_status_filter,
    cp_due_to_filter: $parent.le.due_to_filter
    
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

      '': [

        FlexSpacedRow({},
          FlexCol({},
            { h6: { text: "Type" }},
            { input: { 
              'ha.value': Bind($ => $.scope.name)
            }},
            { div: '[T,D,M,X]',}
          ),
          FlexCol({},
            { h6: { text: "Custom Color" }},
            { input: { 
              'a.value': Bind($ => $.scope.custom_color)
            }},
            { input: { 
              'ha.type': 'color',
              'a.value': Bind($ => $.scope.custom_color)
            }},
          ),
          FlexCol({},
            { h6: { text: "Start" }},
            { input: { 
              'ha.value': Bind($ => $.scope.position), a_type: 'number'
            }},
            { div: {text: $=>"From: 20"+($.scope.days[parseInt($.scope.position)+parseInt(activityStartIndex)+1]?.date_str.replaceAll("-", "/") ?? ' - err'), style: 'font-weight: 600'}},
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
          FlexSpacedRow({}, 
            { div: { '': [
              { button: { text: "Cancel", handle: { onclick: $=>onCancel() }, style:'color: black; font-weight: 800;'}},
              { button: { text: "Delete", handle: { onclick: $=>onDelete() }, meta: {if: $=>onDelete !== undefined}, style:'color: red; font-weight: 600;'}},
              { button: { text: "Confirm", handle: { onclick: $=>onConfirm({idx: $.scope.idx, newIdx: $.scope.newIdx, name: $.scope.name, len: $.scope.len, description: $.scope.description, custom_color: $.scope.custom_color, todos: $.scope.todos}) }, style:'color: '+green+'; font-weight: 800;'}},
            ]}},
            { div: { '': [
              { button: { text: "Cut", handle: { onclick: $=>{SubtaskCopyService.copy({ name: $.scope.name, len: $.scope.len, description: $.scope.description, custom_color: $.scope.custom_color, todos: $.scope.todos}); onDelete()} }, style:'color: red; font-weight: 800;margin-right: 15px'}},
              { button: { text: "Copy", handle: { onclick: $=>SubtaskCopyService.copy({ name: $.scope.name, len: $.scope.len, description: $.scope.description, custom_color: $.scope.custom_color, todos: $.scope.todos}) }, style:'color: black; font-weight: 800;'}},
              { button: { text: "Paste", handle: { onclick: $=>SubtaskCopyService.paste($.scope) }, style:'color: black; font-weight: 800;'}},
            ]}},
          )
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
        resize: both;
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
  app = RenderApp(document.body, $$GanttSubTaskEditor({$parent: $, days: $.scope.proj_days, projectStartDate: $.scope.project?.startDate, activityStartIndex: $.scope.activity.start, subtask: $.scope.subtask, onConfirm: onConfirm, onCancel: onCancel, onDelete: onDelete}))
}


const todosGroupedByDueTo = (todos) => {
  const todos_map = {}
  for (let todo of todos){
    if (todos_map[todo.due_to ?? 0] === undefined){
      todos_map[todo.due_to ?? 0] = {...todo}
    }
    // ho già un valore: sovrascrivo solo se ho un todo NON completato, altrimetni lascio quello che c'era -> ciò implca arrivare ad avere todo non completati come priority n.1 del grouping
    else if (!todo.done) {
      todos_map[todo.due_to ?? 0] = {...todo}
    }
  }
  return Object.values(todos_map)
} 
const TodoMarker = { span: { meta: {forEach: 'todo', of: $ => $.le.show_todo_graph_filter.show ? todosGroupedByDueTo(($.scope.visible_todos ?? []).filter(t => (t.due_to ?? 0) > 0 )) : [] }, // filter only available

  style: $ => ({
    width: (1+((1/3) * DAY_SIZE_PX))+"px",
    height: (1+((1/3) * DAY_SIZE_PX))+"px",
    left: ((DAY_SIZE_PX * (($.meta.todo.due_to ?? 0)))-0.5-((2/3) * DAY_SIZE_PX))+"px",
    top: "-2px",
    background: $.meta.todo.done ? green : 'black',
    position: 'absolute', 
    borderRadius: '100%',
    visibility: $.meta.todo.due_to > 0 ? 'visible':'hidden'
  })
}}

const TodosProgressBar = { div: { meta: {if: $ => $.le.show_todo_graph_filter.show && $.meta.subtask.todos?.length > 0},
  style: $ => ({
    width: 'max(3px, ' + ($.scope.completion_perc*100) + '%)',
    height: '3px',
    background: $.scope.completion_perc === 0 || $.scope.completion_perc === 1 ? '#00800055': '#00000055' ,
    position: 'absolute',
    left: '0px',
    top: '0px'
  })
}}


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

          text: f`@activity.name || '(empty name)'`, 
          a_style: "overflow-y: auto; max-width: "+(2*HEDADER_WIDTH/3)+"px; overflow-wrap: anywhere; display: inline-table; background: white; font-weight: 600; min-height: "+ROW_HEIGHT+"px"
        }},

        { span: {   meta: { if: f`@buttons_visible`},

          '': [

            // { button: {

            //   text: "-",

            //   handle_onclick: async $=> await $.le.api.decrementActivityLen($.scope.project.id, $.scope.activity),

            //   a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            // }},

            // { button: {

            //   text: "<",

            //   handle_onclick: async $=> await $.le.api.moveActivityLeft($.scope.project.id, $.scope.activity),

            //   a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            // }},

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

            // { button: {

            //   text: ">",

            //   handle_onclick: async $=> await $.le.api.moveActivityRight($.scope.project.id, $.scope.activity),

            //   a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            // }},

            // { button: {

            //   text: "+",

            //   handle_onclick: async $=> await $.le.api.incrementActivityLen($.scope.project.id, $.scope.activity),

            //   a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            // }},
              
            { button: {

              text: "+",
              
              handle_onclick: $=>{
                let app;

                let onConfirm = (edits)=>{
                  $.le.api.addActivity($.scope.project.id, edits.name, edits.color, edits.start, edits.len, edits.subtasks_default_color, edits.subtasks, $.scope.activity_idx+1)
                  app.destroy()
                  app = undefined
                }
                let onCancel = ()=>{
                  app.destroy()
                  app = undefined
                }
                app = RenderApp(document.body, $$GanttActivityEditor({is_new: true, parent: $.this, days: $.scope.proj_days, activity: {name: $.scope.activity.name + " / new ", color: $.scope.activity.color, start: ($.scope.activity.start ?? 0) + ($.scope.activity.len ?? 1), len: 15, subtasks_default_color: $.scope.activity.subtasks_default_color, subtasks: []}, onConfirm: onConfirm, onCancel: onCancel}))
              },
              
              a_style: "width: 25px; margin-left: 5px; border: 1px solid #dddddd; border-radius: 20px; background: none; cursor: pointer"
            }}
          ]
        }}

      ],

      a_style: "display: flex; justify-content: space-between; min-height: "+ROW_HEIGHT+"px; align-items: center;", 

    }}
  ],

  a_style: "width: "+HEDADER_WIDTH+"px; display: inline-block; min-height: "+ROW_HEIGHT+"px; position: sticky; left: calc(200px + 16px + 13px); z-index: 999; background: white; padding-top: 25px; margin-top: -25px;"

}}
const GanttRowActivityGraph = { div: {

  def_completeMoove: async $=>{
    let new_start =  Math.max(0, $.scope.activity.start+ Math.round($.this.tmp_offset/DAY_SIZE_PX))
    await $.le.api.editActivity($.scope.project.id, $.scope.activity, {...$.scope.activity, start: new_start ?? 0})
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
      if ((subtask.description.length === 0 && (subtask.todos?.length ?? 0) === 0) || ((subtask.description.length > 0 || subtask.todos?.length > 0) && prompt("Are you sure you want to delete subtask? To-Do:"+(subtask.todos?.length ?? 0)+", Description: "+subtask.description+". (Y/N)", "Y/N")==="Y"))
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

    { span: { meta: {if: $ => $.le.show_activity_name_filter.show_names},

      def_openActivityEditor: openActivityEditor,

      handle_onclick: ($, e)=>{ e.stopPropagation(); $.this.openActivityEditor()},

      text: f`@activity.name`, 

      a_style: "top: -23px; position: absolute; color: black; font-weight: 700; text-wrap: nowrap;"
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
        let todos = ''

        if ($.le.show_in_popup_filter.shuld_show_todo()){
            
          let base_position = $.scope.subtask.idx/DAY_SIZE_PX;
          let activityStartIndex = $.scope.activity.start
          let days = $.scope.proj_days
          let get_todo_due_date_as_txt = (todo)=>{ 
            return (todo.due_to ?? 0) > 0 ? 
              ' [' + "20"+(days[parseInt(base_position)+parseInt(activityStartIndex) + parseInt(todo.due_to ?? 0)-1]?.date_str.replaceAll("-", "/") ?? ' - err') +'] ' 
              : 
              ''
          }
          todos = $.scope.visible_todos?.map(t=> '- ' + (t.done ? '[Done]' : '[To-Do]') + ' ' + t.text + ( t.estimated ? (' ['+t.estimated+'d] ') : '') + get_todo_due_date_as_txt(t) + ( t.tags?.length > 0 ? ('[' +t.tags?.join(', ')+']') : '') ).join('\n') || ''
        }
         
        const todos_part = todos 
        const description_part = $.le.show_in_popup_filter.shuld_show_notes() ? $.scope.subtask.description : ''

        $.le.popover_service.show(($.scope.completion_perc >= 0 && todos_part ? "Done: "+($.scope.completion_done)+" of "+($.scope.completion_total)+" - "+($.scope.completion_perc*100).toFixed(1)+'%\n\n' : '') + todos_part + (todos_part + description_part ? "\n" : '') + description_part) // todo: better use array, filter '', join '\n'
      },
      handle_onmouseout: $ => {
        $.le.popover_service.hide()
      },

      let_is_visible: $ => {

        const is_visible_by_tag_filter = ()=>{
          const selected_by_tags = $.le.tags_filter.selected;
          const selected_by_status = $.le.tags_status_filter.selected;
          const selected_by_due_to = $.le.due_to_filter.selected;
          
          if (selected_by_tags.length === 0 && selected_by_status.length === 0 && selected_by_due_to === 'All'){
            return true
          } 

          for (let todo of $.meta.subtask.todos ?? []){
            for (let tag of todo.tags){
              if ((selected_by_tags.length === 0 || (selected_by_tags.length > 0 && selected_by_tags.includes(tag))) && 
                  (selected_by_status.length === 0 || (selected_by_status.length > 0 && selected_by_status.includes(todo.done ? 'Done' : 'To-Do'))) &&
                  (selected_by_due_to === 'All' || (selected_by_due_to === 'Planned' && todo.due_to > 0 ) || (selected_by_due_to === 'Not Planned' && (todo.due_to <= 0 || todo.due_to === undefined) )) ){
                return true
              }
            } 
          }
          
          return false
        }

        const is_visible_by_notes_filter = ()=>{
          const selected = $.le.notes_filter.selected
          if (selected.length === 0){
            return true
          }

          let has_note_as_txt = ($.meta.subtask.description ?? '')?.length === 0 ? 'Without-Notes' : 'With-Notes'
          if (selected.includes(has_note_as_txt)){
            return true
          }
          
          return false
        }

        const is_visible_by_single_type_filter = ()=>{
          const value = $.le.type_filter.value
          if (value.length === 0){
            return true
          }

          if (($.meta.subtask.name ?? '')?.toUpperCase().startsWith(value.toUpperCase())){
            return true
          }
          
          return false

        }

        const is_visible_by_type_filter = ()=>{
          const values = $.le.type_filter.values
          if (values.length === 1){
            return is_visible_by_single_type_filter()
          }

          let name = ($.meta.subtask.name ?? '')?.toUpperCase()

          if (values.some(value => value !== '' && name.startsWith(value.trim().toUpperCase()) )){
            return true
          }
          
          return false
        }

        return is_visible_by_tag_filter() && is_visible_by_notes_filter() && is_visible_by_type_filter()
        
      },
      
      let_visible_todos: $ => {
        const selected_by_tags = $.le.tags_filter.selected;
        const selected_by_status = $.le.tags_status_filter.selected;
        const selected_by_due_to = $.le.due_to_filter.selected;
        const todos = $.meta.subtask.todos ?? []

        if (selected_by_tags.length === 0 && selected_by_status.length === 0 && selected_by_due_to === 'All'){
          return sort_todos(todos)
        } 
        else {
          const filtered_todos = todos.filter(todo => {

            let with_status_condition = selected_by_status.length === 0 || 
                                        (selected_by_status.length > 0 && selected_by_status.includes(todo.done ? 'Done' : 'To-Do'));

            let with_due_to_condition = (selected_by_due_to === 'All' || 
                                        (selected_by_due_to === 'Planned' && todo.due_to > 0 ) || 
                                        (selected_by_due_to === 'Not Planned' && (todo.due_to <= 0 || todo.due_to === undefined) ));

            let with_tags_condition = todo.tags.filter(tag => 
                                        selected_by_tags.length === 0 || 
                                        (selected_by_tags.length > 0 && selected_by_tags.includes(tag))
                                      ).length > 0;

            return with_tags_condition && with_due_to_condition && with_status_condition

          })
          return sort_todos(filtered_todos)
        }
      },

      let_completion_done: $ => $.scope.visible_todos?.filter(t=>t.done)?.length ?? 0,
      let_completion_total: $ => $.meta.subtask.todos?.length,
      let_completion_perc: $ => $.scope.completion_done / ($.scope.completion_total ?? -1),

      text: [
        f`@subtask.name`,
        TodosProgressBar,
        TodoMarker,
      ],

      a_style: $=>({
        width: (($.subtask.len || 1) * DAY_SIZE_PX)+"px",
        height: "30px", 
        marginLeft: ($.scope.subtask.idx+(Math.ceil($.scope.subtask.idx/DAY_SIZE_PX)/30*0.5)) + "px", 
        position: "absolute", 
        top: "0px", 
        padding: "4px", 
        backgroundColor: $.scope.subtask?.custom_color || getColorTask($.scope.subtask.name, $.scope.activity.subtasks_default_color),
        textAlign: "center",
        textWrap: 'nowrap',
        opacity: $.is_visible ? null : '0',
      })
    }}
  ],

  a_style: $=>({
    marginLeft: ($.this.tmp_offset + $.scope.activity.start * DAY_SIZE_PX + Math.ceil($.scope.activity.start/30*0.5)+1) + "px", // for the header row
    width: ($.scope.activity.len*DAY_SIZE_PX + Math.ceil($.scope.activity.start/30*0.5)+1)+"px",
    height: "30px",
    display: "inline-block",
    backgroundColor: $.scope.activity.color || green,
    color: "white",
    textAlign: "center",
    // overflow: "auto",
    userSelect: "none",
    position: "relative"
  })

}}
const GanttRow = { div: {   meta: {forEach: "activity", of: f`@activities || []`, define: {index: "activity_idx", first: "isFirst", last: "isLast"}},
  ...DRAG_DROP_LIST_ITEM_DIRECTIVE__DRAGGABLE_ELEMENT_DEF(),
  
  let_is_visible: $ => {

    const is_visible_by_single_activity_filter = ()=>{
      const value = $.le.activity_filter.value
      if (value.length === 0){
        return true
      }

      if (($.meta.activity.name ?? '')?.toUpperCase().includes(value.toUpperCase())){
        return true
      }
      
      return false
    }
    
    const is_visible_by_activity_filter = ()=>{
      const values = $.le.activity_filter.values
      if (values.length === 1){
        return is_visible_by_single_activity_filter()
      }

      let name = ($.meta.activity.name ?? '')?.toUpperCase()

      if (values.some(value => value !== '' && name.includes(value.toUpperCase()) )){
        return true
      }
      
      return false
    }

    return is_visible_by_activity_filter()
    
  },

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
    position: 'relative',
    borderTop: "0.5px solid black",
    borderBottom: $.meta.isLast ? "0.5px solid black" : "none",
    paddingTop:  $.is_visible ? "25px" : '0px',
    paddingBottom:  $.is_visible ? "5px" : '0px',
    opacity: $.is_visible ? null : '0',
    height: $.is_visible ? null : "0px", 
    pointerEvents: $.is_visible ? null : 'none',
  })

}}
const GanttRows  = { div: {

  ...DRAG_DROP_LIST_ITEM_DIRECTIVE__ELEMENTS_CONTAINER_DEF(
    // on swap:
    ($, drop_target_$, evt, draggedIdx, droppedIdx) => {
      $.le.api.moveActivityTo($.scope.project.id, draggedIdx, droppedIdx)
    }, 
    'activity_idx', 
    { 
     // set: ($, el) => {$.el.style.border = '2px solid black'}, remove: ($, el) => {$.el.style.border = '1px solid black'}
    }
  ),
  
  '': [
    cle.div({
      style: {
        width: HEDADER_WIDTH+"px",
        height: '0px',
        position: 'sticky',
        left: 'calc(200px + 16px + 16px)',
      },
    },     
      cle.div({
        style: $=>({
          width: HEDADER_WIDTH+"px",
          minHeight: 'calc(100vh - 100px)',
          height: ROW_HEIGHT*2*($.scope.activities?.length+1)+"px",
          position: 'absolute',
          top: '0px',
          left: '0px',
          background: '#ffffff88',
        }),
      })
    ),
    
    { div: {
      a_style: "position: fixed;top: 0px;left: 230px;width: 300px;",
      '': [
        { div: {
          style: {
            height: '100vh',
            position: 'absolute',
            width: '300px',
            bottom: '0px',
            zIndex: '999',
            background: 'white',
            top: '0px',
            opacity: 0.8
          }
        }}
      ]
    }},

    GanttRow,

    { div: {
      a_style: "margin-top: 5px; position: relative;",

      '': [
        { button: {

          text: "Add",

          def_openActivityCreator: $=>{
            let app;

            let onConfirm = (edits)=>{
              $.le.api.addActivity($.scope.project.id, edits.name, edits.color, edits.start, edits.len, edits.subtasks_default_color, edits.subtasks, undefined)
              app.destroy()
              app = undefined
            }
            let onCancel = ()=>{
              app.destroy()
              app = undefined
            }
            app = RenderApp(document.body, $$GanttActivityEditor({is_new: true, parent: $.this, days: $.scope.proj_days, activity: {name: "New..", color: green, start: 0, len: 5, subtasks_default_color: 'orange', subtasks: []}, onConfirm: onConfirm, onCancel: onCancel}))
          },
          handle_onclick: $=>$.this.openActivityCreator(),

          a_style: "width: "+(HEDADER_WIDTH-5)+"px; position: sticky; left: calc(200px + 16px + 16px)"
        }}
      ]
    }},
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
    
    { div: {   meta: {forEach: "month", of: $=>$.scope.proj_months},

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
  a_style: $ => "width: "+GRAPH_WIDTH+"px; display: block; position: absolute; min-height: calc(100vh - 100px); height: "+(ROW_HEIGHT*2*($.scope.activities?.length+1))+"px; "
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

    { div: { meta: {if: f`@content !== undefined && !$.le.show_in_popup_filter.popup_disabled`},

      a_style: "position: fixed; right: calc(calc(100vw - 230px) * 0.1); min-width: 200px; width: calc(calc(100vw - 230px) * 0.8); bottom: 25px; min-height: 120px; max-height: 70vh; padding: 10px; z-index: 1000; background-color: white; border: 1px solid #aaaaaa; overflow-y: auto",

      '': {pre: { text: $ => $.scope.content || "(Nothing To Show)", style: $ => $.scope.content ? 'font-weight: 400; wrap-word; overflow-wrap: break-word; text-wrap: wrap;' : 'color: #ccc' }}
    }}
}}

const TagsFilterSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Tags"},
        { button: { onclick: $ => $.le.tags_filter.selected = [], text: 'x'}}
      ),

      cle.div({
        id: "tags_filter",
        
        let:{
          selected: [],
          filtering: $ => $.scope.selected?.length !== 0
        },

        // on_this_selectedChanged: $=>{console.log("selected tags changed", $.selected)},

        on_scope_project_tagsChanged: $ => {
          if ($.scope.selected?.length > 0){
            $.scope.selected = $.scope.selected?.filter(tag => $.scope.project_tags.includes(tag))
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = Array.from(e.target.selectedOptions).map(s=>s.value)}, class: "browser-default", a_multiple: true, style: 'min-height: 100px;'},
          cle.option({ meta: {forEach: 'tag', of: $ => $.scope.project_tags}, 
            ha_value: $=>$.tag, 
            ha_selected: $=>$.scope.selected.includes($.tag), 
          }, $ => $.tag)
        )
      )
    )
  )
}

const TagsDoneSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Status"},
        { button: { onclick: $ => $.le.tags_status_filter.selected = [], text: 'x'}}
      ),

      cle.div({
        id: "tags_status_filter",
        
        let:{
          selected: [],
          filtering: $ => $.scope.selected?.length !== 0
        },

        on_scope_project_tagsChanged: $ => {
          if ($.scope.selected?.length > 0){
            $.scope.selected = [...$.scope.selected]
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = Array.from(e.target.selectedOptions).map(s=>s.value)}, class: "browser-default", a_multiple: true, style: 'min-height: 60px;'},
          cle.option({ meta: {forEach: 'status', of: ['To-Do', 'Done']}, 
            ha_value: $=>$.status, 
            ha_selected: $=>$.scope.selected.includes($.status), 
          }, $ => $.status)
        )
      )
    )
  )
}

const NotesSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Notes"},
        { button: { onclick: $ => $.le.notes_filter.selected = [], text: 'x'}}
      ),

      cle.div({
        id: "notes_filter",
        
        let:{
          selected: [],
          filtering: $ => $.scope.selected?.length !== 0
        },

        on_scope_projectChanged: $ => {
          if ($.scope.selected?.length > 0){
            $.scope.selected = [...$.scope.selected]
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = Array.from(e.target.selectedOptions).map(s=>s.value)}, class: "browser-default", a_multiple: true, style: 'min-height: 60px;'},
          cle.option({ meta: {forEach: 'status', of: ['With-Notes', 'Without-Notes']}, 
            ha_value: $=>$.status, 
            ha_selected: $=>$.scope.selected.includes($.status), 
          }, $ => $.status)
        )
      )
    )
  )
}

const TypeFilter = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Type"},
        { button: { onclick: $ => $.le.type_filter.value = '', text: 'x'}}
      ),

      cle.div({
        id: "type_filter",
        
        let:{
          value: '',
          values: $ => $.value.split(";"),
          filtering: $ => $.scope.value?.length !== 0
        },

        on_scope_projectChanged: $ => {
          if ($.scope.value?.length > 0){
            $.scope.value = $.scope.value
          }
        }
      },
        cle.input({ 
          'ha.value': Bind($ => $.scope.value),
          style: 'color: white'
        })
      )
    )
  )
}

const ActivityFilter = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Activity"},
        { button: { onclick: $ => $.le.activity_filter.value = '', text: 'x'}}
      ),

      cle.div({
        id: "activity_filter",
        
        let:{
          value: '',
          values: $ => $.value.split(";"),
          filtering: $ => $.scope.value?.length !== 0
        },

        on_scope_projectChanged: $ => {
          if ($.scope.value?.length > 0){
            $.scope.value = $.scope.value
          }
        }
      },
        cle.input({ 
          'ha.value': Bind($ => $.scope.value),
          style: 'color: white'
        })
      )
    )
  )
}

const ShowInPopupSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Show In Popup"},
        { button: { onclick: $ => $.le.show_in_popup_filter.selected = [], text: 'x'}}
      ),

      cle.div({
        id: "show_in_popup_filter",
        
        let:{
          selected: ['To-Do', 'Notes'],
          filtering: $ => $.scope.selected?.length !== 0,
          popup_disabled: $ => $.selected.length === 0
        },

        def: {
          shuld_show_todo: $=>{
            // if ($.selected.length === 0){
            //   return true
            // }
            
            if ($.selected.includes('To-Do')){
              return true
            }
            
            return false
          },
          
          shuld_show_notes: $=>{
            // if (selected.length === 0){
            //   return true
            // }
            
            if ($.selected.includes('Notes')){
              return true
            }
            
            return false
          }
        },

        on_scope_projectChanged: $ => {
          if ($.scope.selected?.length > 0){
            $.scope.selected = [...$.scope.selected]
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = Array.from(e.target.selectedOptions).map(s=>s.value)}, class: "browser-default", a_multiple: true, style: 'min-height: 60px;'},
          cle.option({ meta: {forEach: 'status', of: ['To-Do', 'Notes']}, 
            ha_value: $=>$.status, 
            ha_selected: $=>$.scope.selected.includes($.status), 
          }, $ => $.status)
        )
      )
    )
  )
}

const ShowActivityNameOnGraphSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Name In Graph"},
        { button: { onclick: $ => $.le.show_activity_name_filter.selected = 'Yes', text: 'x'}}
      ),

      cle.div({
        id: "show_activity_name_filter",
        
        let:{
          selected: 'Yes',
          filtering: $ => $.scope.selected !== undefined,
          show_names: $ => $.this.selected === 'Yes'
        },

        on_scope_projectChanged: $ => {
          if ($.scope.selected !== undefined){
            $.scope.selected = $.scope.selected
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = e.target.value}, class: "browser-default", style:'height: 2.5rem;'},
          cle.option({ meta: {forEach: 'val', of: ['Yes', 'No']}, 
            ha_value: $=>$.val, 
            ha_selected: $=>$.scope.selected === $.val, 
          }, $ => $.val)
        )
      )
    )
  )
}

const ShowTodoStatusOnGraphSelector = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Todos In Graph"},
        { button: { onclick: $ => $.le.show_todo_graph_filter.selected = $.le.show_todo_graph_filter.initial, text: 'x'}}
      ),

      cle.div({
        id: "show_todo_graph_filter",
        
        let:{
          initial: 'Yes',
          selected: $ => $.scope.initial,
          filtering: $ => $.scope.selected !== undefined,
          show: $ => $.this.selected === 'Yes'
        },

        on_scope_projectChanged: $ => {
          if ($.scope.selected !== undefined){
            $.scope.selected = $.scope.selected
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = e.target.value}, class: "browser-default", style:'height: 2.5rem;'},
          cle.option({ meta: {forEach: 'val', of: ['Yes', 'No']}, 
            ha_value: $=>$.val, 
            ha_selected: $=>$.scope.selected === $.val, 
          }, $ => $.val)
        )
      )
    )
  )
}

const DueToFilter = () => {

  return (
    cle.div({},
      
      FlexSpacedRow({},
        { h6: "Filter By Plannig"},
        { button: { onclick: $ => $.le.due_to_filter.selected = 'All', text: 'x'}}
      ),

      cle.div({
        id: "due_to_filter",
        
        let:{
          selected: 'All',
          filtering: $ => $.scope.selected !== undefined,
          show_dueto_only: $ => $.this.selected === 'Planned'
        },

        on_scope_projectChanged: $ => {
          if ($.scope.selected !== undefined){
            $.scope.selected = $.scope.selected
          }
        }
      },
        cle.select({ a_value: $=>$.scope.selected, h_onchange: ($, e)=>{ $.scope.selected = e.target.value}, class: "browser-default", style:'height: 2.5rem;'},
          cle.option({ meta: {forEach: 'val', of: ['All', 'Planned', 'Not Planned']}, 
            ha_value: $=>$.val, 
            ha_selected: $=>$.scope.selected === $.val, 
          }, $ => $.val)
        )
      )
    )
  )
}


export const GanttPage = async (state)=>{ console.log("STATE:", state); return { 
  div: {

    id: "app",

    let_pywebviewReady: false,

    let_projects: undefined,
    let_project: undefined,
    let_project_tags: [],
    let_today: (()=>{ let d = new Date; return (d.getFullYear()-2000) +"-"+ (d.getMonth()+1) +"-"+ (d.getDate())})(),

    // todo: cachare
    let_dyn_props_cache: {},
    let_proj_months: $ => {
      if($['this']['dyn_props_cache']['proj_months'] !== $.scope.project?.startDate){
        $['this']['dyn_props_cache']['proj_months'] = getCalendar(new Date($.scope.project?.startDate), NUM_DAYS, true)
      }
      return $['this']['dyn_props_cache']['proj_months']
    },
    let_proj_days: $ => {
      if($['this']['dyn_props_cache']['proj_days'] !== $.scope.project?.startDate){
        // console.log("SET dyn_props_cache proj_days")
        $['this']['dyn_props_cache']['proj_days'] = getCalendar(new Date($.scope.project?.startDate), NUM_DAYS, false)
      }
      return $['this']['dyn_props_cache']['proj_days']
    },

    let_lastupdate: 0,
    let_lastupdate_date: $ => (($.this.lastupdate === 0 ? new Date() : new Date($.this.lastupdate)).toString()),
    let_should_reload: false,
    
    afterChildsInit: async $ => {
      await pywebviewReady
      $.this.pywebviewReady = true
      
      console.log(pywebview)
      console.log(pywebview.api)
      console.log(Object.keys(pywebview.api))

      await $.le.api.getProjects()
      await $.le.api.getProject(state?.projId)
      console.log($.this.projects)
      console.log($.this.project)      
      await $.le.api.getProjectTags($.project.id);

      // console.log("$.proj_days, $.proj_months", $.proj_days, $.proj_months)
    },

    '':[
      
      Api,

      MainLayout({
        SideBarLogo: { span: { text: "Gantt", a_style: "font-size: 1.9rem; margin-left: 15px; margin-right: 15px;" }},

        NavbarContents:[
          { spanù: { text: " ", a_style: "font-size: 1.9rem; margin-left: 5px;" }},
          { span: { meta: {if: $ => $.scope.pywebviewReady}, '': [              
            { span: { text: ["Last Disk Reload: ", $ => $.scope.lastupdate_date?.split("GMT")?.[0]], a_style: "margin-right: 15px;" }},
            { span: { meta:{if: $ => $.scope.should_reload}, text: ["Should Reload"], a_style: $ => ({color: $.scope.should_reload ? '#f38b8b' : null, marginRight: '15px'})}},
            { button: {text: "Backup", h_onclick: $=>{$.le.api.storeBackup()}, a_style: "background: #cccccc33; border: 0.25px dashed #dddddd; padding: 5px;color: #dddddd; cursor: pointer;margin-right: 15px;"}},
            { button: {text: "Reload From Disk", h_onclick: $=>{$.le.api.forceReloadData()}, a_style: "background: #cccccc33; border: 0.25px dashed #dddddd; padding: 5px;color: #dddddd; cursor: pointer;"}},
          ]}}
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
                    if (prompt("Are you sure you want to delete this project? (Y/N)", "Y/N")==="Y"){
                      console.log("remove proj: ", $.proj); 
                      await $.le.api.removeProject($.proj.id)
                      Router.navigate("home", undefined, true)
                    }
                  }
                }},
              ],
              a_style: "margin-left: 25px; cursor: pointer;"
            }},
            { button: {text: "Add New Project", h_onclick: async $=>{Router.navigate("home", {projId: await $.le.api.newProject()}, false)}, a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            // { button: {text: "Reload Data", h_onclick: $=>$.le.api.forceReloadData(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            // { button: {text: "Execute Backup Now", h_onclick: $=>$.le.api.storeBackup(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 10px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            { hr: {}},
            ActivityFilter(),
            { hr: {}},
            TagsFilterSelector(),
            { hr: {}},
            TagsDoneSelector(),
            { hr: {}},
            NotesSelector(),
            { hr: {}},
            DueToFilter(),
            { hr: {}},
            ShowInPopupSelector(),
            { hr: {}},
            TypeFilter(),
            { hr: {}},
            ShowActivityNameOnGraphSelector(),
            { hr: {}},
            ShowTodoStatusOnGraphSelector(),
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

      Use(Timer, {
        id: "lastload_timer", 
        interval: 5000, running: true, repeat: true, trigerOnStart: true, 

        on_trigger: async $ => {
          if ($.scope.pywebviewReady){
            $.scope.lastupdate = await $.le.api.getLastLoad()
            let should_reload = await $.le.api.shouldReload()
            if ($.scope.should_reload !== should_reload){
              $.scope.should_reload = should_reload
            }
          }
        }
      }),


      // CSS overwriter 
      { Css: { css: [
        '.grid-layout {grid-template-columns: auto auto auto auto auto auto;} ',
        '.navbar {position: sticky; top: 0px; z-index: 1000; }',
        '.sidebar {position: sticky; left: 0; z-index: 1000; }',
      ]}}

    ],

    attrs: { style: "width: fit-content; height: fit-content; padding: 0px; margin: 0px;" },
    css: [ `* { box-sizing: border-box !important;} body { padding: 0px; margin: 0px; }` ],

}}}

// -per avere subactivity senza ricorsione: li metto tutti come activity, magari con link al parent id, ma soprattutto costruisco "l'indice" come numero molto grande (tipo ragionamento a bit) es: 100 (parent), 110 (1st child), 111 (1st subchild)..poi ordino prima di mostrare..
// potrei anche costruire indice come Array.apply.tanto mi basta metterli vicino e fare un padEnd.. una cosa intelligente sarebbe andare a botte di 2 cifre: l''es di prima diventa: [01,00,00] (parent), [01, 01, 00] (1st child), [01, 01, 01] (1st subchild)
// il parent deve poi mantenere il "master index", ovvero quello manuale scelto dall''utente, per riordinare in blocco!

// -per ogni subtask posso aprire finestra day con 4 blocchi da 2h (anche in fila) o 8 da 1h, clickando sull''header invece si vede giorno completo.

// -modificare grafica, con subtask sotto la barra, nome sopra (basta togliere overflow , aumentare padding, e top più alto)