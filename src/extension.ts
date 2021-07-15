import * as vscode from 'vscode';
const pkg = require('../package.json');

import { explicitFoldingExtensionId, ExplicitFoldingHub } from '@zokugun/vscode.explicit-folding-api';

const VERSION_KEY = 'cobolFoldingVersion';

let $foldingHub: ExplicitFoldingHub | undefined;

async function showWhatsNewMessage(version: string) { // {{{
	const actions: vscode.MessageItem[] = [{
		title: 'Homepage'
	}, {
		title: 'Release Notes'
	}];

	const result = await vscode.window.showInformationMessage(
		`Cobol Folding has been updated to v${version} — check out what's new!`,
		...actions
	);

	if (result != null) {
		if (result === actions[0]) {
			await vscode.commands.executeCommand(
				'vscode.open',
				vscode.Uri.parse(`${pkg.homepage}`)
			);
		} else if (result === actions[1]) {
			await vscode.commands.executeCommand(
				'vscode.open',
				vscode.Uri.parse(`${pkg.homepage}/blob/master/CHANGELOG.md`)
			);
		}
	}
} // }}}

function setup() { // {{{
	const explicitFoldingExtension = vscode.extensions.getExtension<ExplicitFoldingHub>(explicitFoldingExtensionId);

	$foldingHub = explicitFoldingExtension?.exports;

	if ($foldingHub) {
		const config = vscode.workspace.getConfiguration('cobolFolding');

		const enabled = config.get<boolean>('enabled');

		if (enabled) {
			$foldingHub.registerFoldingRules('cobol', [
				// Comments block
				{
					name: 'comment',
					whileRegex: '^.{6}\\*',
					kind: 'comment'
				},
				// Division
				{
					name: 'division',
					separatorRegex: '^.{6} {1,4}[A-Za-z0-9\\-_:]+ +(?i:DIVISION)',
					strict: 'never',
					nested: [
						// Section
						{
							name: 'section',
							separatorRegex: '^.{6} {1,4}[A-Za-z0-9\\-_:]+ +(?i:SECTION)',
							nested: [
								// Paragraph
								{
									name: 'paragraph',
									separatorRegex: '^.{6} {1,4}[A-Za-z0-9\\-_:]+(?! +(?i:SECTION|DIVISION))',
									nested: [
										// Page eject
										{
											name: 'eject',
											separatorRegex: '^.{6}\\/'
										}
									]
								}
							]
						}
					]
				}
			]);
		} else {
			$foldingHub.unregisterFoldingRules('cobol');
		}
	}
} // }}}

export async function activate(context: vscode.ExtensionContext) { // {{{
	const previousVersion = context.globalState.get<string>(VERSION_KEY);
	const currentVersion = pkg.version;

	const config = vscode.workspace.getConfiguration('explicitFolding');

	if (previousVersion === undefined || currentVersion !== previousVersion) {
		context.globalState.update(VERSION_KEY, currentVersion);

		const notification = config.get<string>('notification');

		if (previousVersion === undefined) {
			// don't show notification on install
		} else if (notification === 'major') {
			if (currentVersion.split('.')[0] > previousVersion.split('.')[0]) {
				showWhatsNewMessage(currentVersion);
			}
		} else if (notification === 'minor') {
			if (currentVersion.split('.')[0] > previousVersion.split('.')[0] || (currentVersion.split('.')[0] === previousVersion.split('.')[0]) && currentVersion.split('.')[1] > previousVersion.split('.')[1]) {
				showWhatsNewMessage(currentVersion);
			}
		} else if (notification !== 'none') {
			showWhatsNewMessage(currentVersion);
		}
	}

	setup();

	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('cobolFolding')) {
			setup();
		}
	});
} // }}}

export function deactivate(): void { // {{{
	if ($foldingHub) {
		$foldingHub.unregisterFoldingRules('cobol');
	}
} // }}}
