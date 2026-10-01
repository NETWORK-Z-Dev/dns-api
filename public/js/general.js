let customPrompts = null;

document.addEventListener("DOMContentLoaded", async function(e) {
    customPrompts = new Prompt();
    await updateHeaderLinks();
    await renderDashboard()
})

function applyHoverEffect(){
    // nothing
}