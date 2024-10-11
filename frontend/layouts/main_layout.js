import {Extended} from "../libs/cle/lib/caged-le.js"
import { NavSidebarLayout } from "../libs/cle/layouts/layouts.js"

export const Navbar = (navbarContents={ div: { text: "Nav", 'ha.style.fontSize': "2rem" }})=>({ div: {

    'a.style': {
        backgroundColor: "#2d3436", //"#2d3436",
        color: "#dddddd",
        height: "60px",
        padding: "10px 1rem"
    },

    text: navbarContents
}})

export const Sidebar = (sidebarContents, Logo="App Logo")=>({ div: {

    'a.style': {
        backgroundColor: "#2d3436",
        color: "#dddddd",
        minHeight: "100%",
        borderRight: "0.25px solid #aaaaaa",
        padding: "10px 1rem"
    },
    
    "=>": [
        { div: { 'a.style': {fontWeight: "100", fontSize: "1.9rem", paddingBottom: "0px", paddingLeft: "10px", backgroundColor: "#f1c40f", color: "white", display: "flex", justifyContent: "center", }, text: Logo}},
        
        ...sidebarContents,
    ]
}})

export const MainContent = (Components)=>({ div: {
    'a.style': {
        minHeight: "calc(100vh - 60px)",
        backgroundColor: 'white',
        padding: "10px"
    },

    "=>": Components
}})


export const MainLayout = ({NavbarContents, SidebarComponents, SideBarLogo, MainContentComponents}={})=>Extended(NavSidebarLayout({
    navbar: Navbar(NavbarContents),
    sidebar: Sidebar(SidebarComponents, SideBarLogo),
    main_content: MainContent(MainContentComponents)
}))