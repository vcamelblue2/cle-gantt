import {pass, none, Use, f, Bind, cle} from "../libs/cle/lib/caged-le.js"
import {Router} from "../libs/cle/routing/lite_routing.js"

import { MainLayout } from "../layouts/main_layout.js"
import { Api, pywebviewReady } from "../api/backend_api.js"

import { Checkbox } from "../libs/cle/components/checkbox.component/checkbox.js"
import { Timer } from "../components/timer.component.js"
import { RoutingButtonLink } from "../components/routing-button.component.js"

// fromHtmlComponentDef

const NoteComponent = { div: { 

  childsRef: {
    editor: "single",
    autosaver: "single"
  },

  let_data_saved: true,
  let_autosave_enabled: true,

  on_this_autosave_enabledChanged: $=> {console.log("autosave changed!!", $.autosave_enabled)},

  '': [

    Use(Timer, {
      name: "autosaver", interval: 1000, running: false, repeat: false, trigerOnStart: false, 

      on_trigger: async $ => {
        // console.log("data autosaved!!")
        await $.ref.editor.save() 
        $.data_saved = true
      }
    }),

    { div: {

      name: "editor",

      editorInstance: undefined,

      afterInit: async ($) => {
        let toolbarOptions = [
          ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
          ['blockquote', 'code-block'],
          ['link', 'image', 'video'],
        
          [{ 'header': 1 }, { 'header': 2 }],               // custom button values
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
          [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
          [{ 'direction': 'rtl' }],                         // text direction
        
          [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        
          [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
          [{ 'font': [] }],
          [{ 'align': [] }],
        
          ['clean']                                         // remove formatting button
        ];

        $.editorInstance = new Quill($.this.el, { 
          modules: {
            toolbar: toolbarOptions,
          },
          theme: 'snow' 
        });

        await $.load()

        $.data_saved = true

        $.editorInstance.on('text-change', function(delta, oldDelta, source) {
          // if (source == 'api') ...

          if ($.autosave_enabled && source == 'user') {
            // console.log("Notes eddited!! must save in 3 sec..");
            $.data_saved = false
            $.ref.autosaver.start()
          }
        });
      },

      def: {
        load: async $ =>  {
          $.editorInstance.setContents(await $.le.api.notes.load())
        },
        save: async $ =>  {
          await $.le.api.notes.save($.editorInstance.getContents())
        }
      }
    }},

    { button: { text: "Reload", onclick: async $ => $.ref.editor.load() }},
    { button: { text: "Save", onclick: async $ => $.ref.editor.save(), style: "margin-left: 10px;" }},

    // Use(Checkbox, {let_selected: Bind(f`@autosave_enabled`), let_label: "Autosave"}),
    
    cle.label({ style: "margin-left: 10px;"}, 
      { input: { a_type: "checkbox", ha_checked: Bind(f`@autosave_enabled`) }}, 
      { span: { text: "Autosave", style: "padding-left: 25px" }}
    ),            

    { button: { meta: {if: $ => $.autosave_enabled && !$.data_saved}, text: "Autosaving..", a_disabled: 'true', style: "margin-left: 15px; font-style: italic"}},

  ]
}}


export const NotesPage = async (state)=>{ console.log("STATE:", state); return { 
  div: {

    id: "app",
    
    afterChildsInit: async $ => {
      await pywebviewReady
    },

    '':[
      
      Api,

      MainLayout({

        NavbarContents:[
          { span: { text: "Notes", a_style: "font-size: 1.9rem; margin-left: 15px; margin-right: 15px;" }}
        ], 

        SidebarComponents:[
          { div: {
            a_style: "width: 200px", 
            '': [
            { h4: "Notes"},
            // { button: {text: "Add New Project", h_onclick: async $=>{Router.navigate("home", {projId: await $.le.api.newProject()}, false)}, a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            // { button: {text: "Reload Data", h_onclick: $=>$.le.api.forceReloadData(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 15px; padding: 10px;color: #dddddd; cursor: pointer;"}},
            // { button: {text: "Execute Backup Now", h_onclick: $=>$.le.api.storeBackup(), a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 10px; padding: 10px;color: #dddddd; cursor: pointer;"}}

            { hr: {}},
            RoutingButtonLink("Open Home", $=>["home", state ? {projId: state.projId} : undefined]),
            RoutingButtonLink("Open Shared Todolist", $=>["todolist", state ? {projId: state.projId} : undefined]),
            RoutingButtonLink("Open Personal Planner", $=>["planner", undefined]),
            ]
          }}
        ], 

        MainContentComponents:[
          NoteComponent
        ]

      }),

      // CSS overwriter 
      { Css: { css: [
        '.grid-layout {grid-template-columns: auto auto auto auto auto auto;} ',
        '.navbar {position: sticky; top: 0px; z-index: 1000; }'
      ]}}

    ],

    attrs: { style: "width: 100%; height: 100%; padding: 0px; margin: 0px;" },
    css: [ `* { box-sizing: border-box !important;} body { padding: 0px; margin: 0px; }` ],

}}}