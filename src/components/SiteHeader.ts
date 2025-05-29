class SiteHeader extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        const headerPartialPath = `${import.meta.env.BASE_URL}partials/header-content.html`;

        try {
            const response = await fetch(headerPartialPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch header content: ${response.statusText}`);
            }
            const headerHTML = await response.text();
            this.innerHTML = headerHTML;
            this.classList.add('loaded')
            // this.updateNavLinks();
        } catch (error) {
            console.error('Error loading header: ', error);
            this.classList.add('loaded')
        }
    }

    // updateNavLinks() {
    //     const navLinks = this.querySelectorAll('#nav-items a');
    //     navLinks.forEach(link => {
    //         const anchor = link as HTMLAnchorElement;

    //         let linkPath = new URL(anchor.href).pathname;
    //         let currentPath = window.location.pathname;

    //         if (linkPath.endsWith('/index.html')) {
    //             linkPath = linkPath.substring(0, linkPath.length - 'index.html'.length) || '/';
    //         }   

    //         if (linkPath === '') {
    //             linkPath = '/';
    //         }

    //         if (currentPath.endsWith('index.html')) {
    //             currentPath = currentPath.substring(0, currentPath.length - 'index.html'.length) || '/';
    //         }

    //         if (currentPath === '') {
    //             currentPath = '/';
    //         }

    //         const isRootPathMatch = (linkPath === '/' || linkPath === '') && (currentPath == '/' || currentPath === '');

    //         if (linkPath === currentPath || (isRootPathMatch && linkPath === currentPath)) {
    //             anchor.className = 'text-sky-600';
    //         } else {
    //             anchor.className = 'text-gray-700 hover:text-sky-600 transition-colors';
    //         }
    //     });
    // }
}

customElements.define('site-header', SiteHeader);