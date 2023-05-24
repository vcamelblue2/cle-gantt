import {pass, none, Use, f, Bind, cle, remoteHtmlComponent, UseShadow, html } from "../../libs/cle/lib/caged-le.js"
import * as Cle from "../../libs/cle/lib/caged-le.js"

import {Router} from "../../libs/cle/routing/lite_routing.js"

import { MainLayout } from "../../layouts/main_layout.js"
import { RoutingButtonLink } from "../../components/routing-button.component.js"

import { Api } from "../../api/backend_api.js"

// setup csz lib 
import {default as csz} from 'https://unpkg.com/csz'
window.css = (v)=>csz([v]) // fix to not use template literal

window.Cle = Cle

export const TodolistPage = async (state)=>{ console.log("STATE:", state); 
    let c = await remoteHtmlComponent("/pages/todolist/todolist")
    
    return cle.div({
      
			id: "app-root",
  
      attrs: { style: "width: 100%; height: 100%; padding: 0px; margin: 0px;" },  
			css: [`
					* { 
						box-sizing: border-box !important;
					}
					body {
							font-family: Lato;
							letter-spacing: 0.1px;
							padding: 0px; 
							margin: 0px;
							overflow-x: hidden;
					}
			`]
    }, 
        cle.link({a: {href:"https://fonts.googleapis.com/css?family=Source+Code+Pro:400,700|Lato:400,700,900", rel:"stylesheet"}}),

        Api,
				
  
        MainLayout({
  
          NavbarContents:[
            { span: { text: "Notes", a_style: "font-size: 1.9rem; margin-left: 15px; margin-right: 15px;" }}
          ], 
  
          SidebarComponents:[
            { div: {
              a_style: "width: 200px", 
              '': [
              { h4: "Todos"},

              { hr: {}},
							RoutingButtonLink("Open Home", $=>["home", state ? {projId: state.projId} : undefined]),
							RoutingButtonLink("Open Shared Notes", $=>["notes", state ? {projId: state.projId} : undefined]),
							RoutingButtonLink("Open Personal Planner", $=>["planner", undefined]),
              ]
            }}
          ], 
  
          MainContentComponents:[
        		UseShadow({ root: { childs: [c]}})
          ]
  
        }),
  
        // CSS overwriter 
        { Css: { css: [
          '.grid-layout {grid-template-columns: auto auto auto auto auto auto;} ',
          '.navbar {position: sticky; top: 0px; z-index: 1000; }'
        ]}}

    )
}
