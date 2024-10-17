const mainDialog = document.getElementById('mainDialog');
const openDialogButtons = document.querySelectorAll('[data-open-dialog]');
const closeDialogButton = document.getElementById('closeDialog');

function openDialog(dialogType) {
    // Clear previous content
    const dialogContent = mainDialog.querySelector('.dialog-content');
    dialogContent.innerHTML = '';
    
    // Get the template for the specified dialog type
    const template = document.getElementById(`${dialogType}Template`);
    
    if (template) {
        // Clone the template content and append it to the dialog
        const content = template.content.cloneNode(true);
        dialogContent.appendChild(content);
        
        // Show the dialog
        mainDialog.style.display = 'block';
    } else {
        console.error(`Template not found for dialog type: ${dialogType}`);
    }
}

// Function to close the dialog
function closeDialog() {
    mainDialog.style.display = 'none';
}

// Add click event listeners to all open dialog buttons
openDialogButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const dialogType = button.getAttribute('data-open-dialog');
        openDialog(dialogType);
    });
});

// Add click event listener to close button
closeDialogButton.addEventListener('click', closeDialog);

// Close dialog when clicking outside of it
mainDialog.addEventListener('click', (e) => {
    if (e.target === mainDialog) {
        closeDialog();
    }
});