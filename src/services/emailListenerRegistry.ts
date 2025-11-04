import { EmailListener } from './emailListener';

export class EmailListenerRegistry {
	private userIdToListener: Map<string, EmailListener> = new Map();

	getOrCreate(userId: string): EmailListener {
		let listener = this.userIdToListener.get(userId);
		if (!listener) {
			listener = new EmailListener(userId);
			this.userIdToListener.set(userId, listener);
		}
		return listener;
	}

	async startForUser(userId: string): Promise<void> {
		const listener = this.getOrCreate(userId);
		await listener.start();
	}

	async stopForUser(userId: string): Promise<void> {
		const listener = this.userIdToListener.get(userId);
		if (listener) {
			await listener.stop();
		}
	}

	statusForUser(userId: string) {
		const listener = this.userIdToListener.get(userId);
		return listener ? listener.getStatus() : { running: false, connected: false, retryCount: 0 };
	}

	async testForUser(userId: string): Promise<boolean> {
		const listener = this.getOrCreate(userId);
		return listener.testConnection();
	}

	count(): number {
		return this.userIdToListener.size;
	}
}

export default EmailListenerRegistry;
