class SiteFooter extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        const footerPartialPath = `${import.meta.env.BASE_URL}partials/footer-content.html`

        try {
            const response = await fetch(footerPartialPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch footer: ${response.statusText}`);
            }
            const footerHTML = await response.text();
            this.innerHTML = footerHTML;
            this.classList.add('loaded');
        } catch (error) {
            console.error('Error loading footer: ', error);
            this.classList.add('loaded');
        }
    }
}

customElements.define('site-footer', SiteFooter);