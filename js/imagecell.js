// =========== IMAGE CELL COMPONENT ===========
// Create and manage image-based visualization cells
// - Handle image loading and placement
// - Maintain consistent container structure
// - Apply standard styling

export function createImageCell(visContainer, imageName) {
    // =========== CONTAINER SETUP ===========
    // Create container with consistent styling
    // - Add proper class for styling
    // - Maintain responsive layout
    const contentContainer = visContainer
        .append('div')
        .attr('class', 'image-container')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('height', '100%')
        .style('width', '100%')
        .style('padding', '20px')
        .style('box-sizing', 'border-box');

    // =========== IMAGE ELEMENT ===========
    // Create and configure image element
    // - Set source and alt text
    // - Apply responsive sizing
    // - Handle loading states
    contentContainer
        .append('img')
        .attr('src', `./images/${imageName}`)
        .attr('alt', 'Visualization Image')
        .style('max-width', '90%')
        .style('max-height', '90%')
        .style('object-fit', 'contain');
}