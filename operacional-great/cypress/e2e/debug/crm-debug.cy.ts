/// <reference types="cypress" />
export {}

describe('CRM runtime debug', () => {
  it('captures CRM client flow logs', () => {
    const logs: Array<{ type: string; args: unknown[] }> = [];

    cy.visit('/operacional/crm', {
      onBeforeLoad(win) {
        const originalInfo = win.console.info.bind(win.console);
        const originalWarn = win.console.warn.bind(win.console);
        const originalError = win.console.error.bind(win.console);

        win.console.info = (...args: unknown[]) => {
          logs.push({ type: 'info', args });
          originalInfo(...args);
        };

        win.console.warn = (...args: unknown[]) => {
          logs.push({ type: 'warn', args });
          originalWarn(...args);
        };

        win.console.error = (...args: unknown[]) => {
          logs.push({ type: 'error', args });
          originalError(...args);
        };
      },
    });

    cy.get('body', { timeout: 30000 }).should('be.visible');
    cy.wait(10000);

    cy.window().then((win) => {
      const bodyText = win.document.body.innerText;
      cy.writeFile('cypress/tmp/crm-debug.json', {
        bodyText: bodyText.slice(0, 2000),
        logs,
      }, { log: false });
    });
  });
});
