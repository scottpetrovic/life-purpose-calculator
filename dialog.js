const dialogOverlay = document.getElementById('dialogOverlay');
const openDialogLink = document.getElementById('openDialog');
const closeDialogButton = document.getElementById('closeDialog');

function openDialog() {
    dialogOverlay.style.display = 'block';
}

function closeDialog() {
    dialogOverlay.style.display = 'none';
}

openDialogLink.addEventListener('click', function(e) {
    e.preventDefault();
    openDialog();
});

closeDialogButton.addEventListener('click', closeDialog);

dialogOverlay.addEventListener('click', function(e) {
    if (e.target === dialogOverlay) {
        closeDialog();
    }
});