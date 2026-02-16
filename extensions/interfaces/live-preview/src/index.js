import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'live-preview',
	name: 'Live Preview',
	icon: 'visibility',
	description: 'Previzualizare live a articolului exact cum va arata pe site',
	component: InterfaceComponent,
	types: ['alias'],
	localTypes: ['presentation'],
	group: 'presentation',
	options: null,
});
