<template>
	<v-card class="login-card" color="rgba(18, 24, 20, 0.98)" dark>
		<v-btn icon small class="login-close" aria-label="Close" @click="$emit('close')">
			<v-icon>mdi-close</v-icon>
		</v-btn>

		<template v-if="authenticated">
			<div class="account-view">
				<div class="login-eyebrow">Signed in as</div>
				<div class="account-email">{{ email }}</div>
				<div class="stats-heading">Solved puzzles by guess count</div>
				<div class="stats-chart" aria-label="Solved puzzles by guess count">
					<div v-for="bucket in statBuckets" :key="bucket.key" class="stats-row">
						<div class="stats-label">{{ bucket.label }}</div>
						<div class="stats-track">
							<div
								class="stats-bar"
								:style="{ width: `${barWidth(bucket.value)}%` }"
								:aria-label="`${bucket.value} solved in ${bucket.label} guesses`"
							>{{ bucket.value }}</div>
						</div>
					</div>
				</div>
				<v-btn block outlined color="green lighten-2" @click="logout">
					<v-icon left>mdi-logout</v-icon>
					Log out
				</v-btn>
			</div>
		</template>
		<template v-else>
		<div class="login-header">
			<div>
				<div class="login-eyebrow">Welcome to the</div>
				<div class="text-h4 font-weight-bold green--text">Nerdle</div>
			</div>
			<v-icon color="green lighten-1" large>mdi-lock-outline</v-icon>
		</div>

		<v-card-text class="pt-2">
			<div class="text-h6 mb-1">{{ isRegistering ? 'Create your account' : 'Log in to save your progress' }}</div>

			<v-form ref="form" @submit.prevent="submit">
				<v-text-field
					v-model.trim="formEmail"
					label="Email"
					type="email"
					autocomplete="email"
					outlined
					dense
					color="green"
					:error-messages="emailError"
					@input="clearError"
				/>
				<v-text-field
					v-model="password"
					label="Password"
					:type="showPassword ? 'text' : 'password'"
					:append-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
					:autocomplete="isRegistering ? 'new-password' : 'current-password'"
					outlined
					dense
					color="green"
					:error-messages="passwordError"
					@click:append="showPassword = !showPassword"
					@input="clearError"
				/>
				<v-text-field
					v-if="isRegistering"
					v-model="confirmation"
					label="Confirm password"
					type="password"
					autocomplete="new-password"
					outlined
					dense
					color="green"
					:error-messages="confirmationError"
					@input="clearError"
				/>

				<v-alert v-if="serverError" dense text type="error" class="mt-2 mb-4">
					{{ serverError }}
				</v-alert>
				<v-alert v-if="successMessage" dense text type="success" class="mt-2 mb-4">
					{{ successMessage }}
				</v-alert>

				<v-btn block color="green" dark large type="submit" :loading="loading">
					{{ isRegistering ? 'Create account' : 'Log in' }}
				</v-btn>
			</v-form>
		</v-card-text>

		<v-card-actions class="justify-center pb-5">
			<span class="login-switch-copy">{{ isRegistering ? 'Already have an account?' : 'New to Nerdle?' }}</span>
			<v-btn text small color="green lighten-2" @click="toggleMode">
				{{ isRegistering ? 'Log in' : 'Register' }}
			</v-btn>
		</v-card-actions>
		</template>
	</v-card>
</template>

<script>
import { loginUser, registerUser } from '@/data'

export default {
	name: 'NerdleLogin',

	props: {
		email: {
			type: String,
			default: ''
		},
		authenticated: {
			type: Boolean,
			default: false
		},
		counts: {
			type: Object,
			default: () => ({})
		},
		completedPuzzles: {
			type: Array,
			default: () => []
		}
	},

	data() {
		return {
			isRegistering: false,
			formEmail: '',
			password: '',
			confirmation: '',
			showPassword: false,
			loading: false,
			emailError: '',
			passwordError: '',
			confirmationError: '',
			serverError: '',
			successMessage: ''
		}
	},

	methods: {
		barWidth(value) {
			const maximum = Math.max(...this.statBuckets.map(bucket => bucket.value), 1)
			return value === 0 ? 0 : Math.max(8, (value / maximum) * 70)
		},

		logout() {
			localStorage.removeItem('nerdle_token')
			localStorage.removeItem('email')
			this.$emit('logout')
            this.clearError()
		},

		clearError() {
			this.emailError = ''
			this.passwordError = ''
			this.confirmationError = ''
			this.serverError = ''
			this.successMessage = ''
		},

		toggleMode() {
			this.isRegistering = !this.isRegistering
			this.clearError()
			this.confirmation = ''
		},

		validate() {
			let valid = true
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

			this.emailError = emailPattern.test(this.formEmail) ? '' : 'Enter a valid email address.'
			this.passwordError = this.password.length >= 8 ? '' : 'Password must be at least 8 characters.'
			this.confirmationError = this.isRegistering && this.password !== this.confirmation
				? 'Passwords must match.'
				: ''
			valid = !this.emailError && !this.passwordError && !this.confirmationError
			return valid
		},

		async submit() {
			this.clearError()
			if (!this.validate()) return

			this.loading = true
			const result = this.isRegistering
				? await registerUser(this.formEmail, this.password)
				: await loginUser(this.formEmail, this.password)
			this.loading = false

			if (!result.ok) {
				this.serverError = result.error
				return
			}

			if (this.isRegistering && !(result.data && result.data.token)) {
				this.successMessage = 'Account created. You can log in now.'
				this.isRegistering = false
			} else {
				this.successMessage = 'You are logged in.'
				this.$emit('authenticated', {
					email: this.formEmail,
					token: result.data && result.data.token
				})
			}
		}
	},

	computed: {
		statBuckets() {
			return [1, 2, 3, 4, 5].map(key => ({
				key,
				label: `${key}`,
				value: Number(this.counts[key] || 0)
			})).concat({
				key: 6,
				label: '6+',
				value: Number(this.counts[6] || 0)
			})
		}
	}
}
</script>

<style scoped>
.login-card {
	position: relative;
	width: min(100%, 440px);
	border: 1px solid rgba(76, 175, 80, 0.28);
	border-radius: 18px;
	box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
}

.login-close {
	position: absolute;
	top: 12px;
	right: 12px;
}

.account-view {
	padding: 32px 24px 24px;
}

.account-email {
	margin: 8px 0 24px;
	color: rgba(255, 255, 255, 0.9);
	font-size: 1.05rem;
	word-break: break-word;
}

.stats-heading {
	margin-bottom: 10px;
	color: rgba(255, 255, 255, 0.72);
	font-size: 0.8rem;
	font-weight: 700;
	text-transform: uppercase;
}

.stats-chart {
	margin-bottom: 24px;
}

.stats-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 6px 0;
}

.stats-label {
	width: 24px;
	color: rgba(255, 255, 255, 0.72);
	font-size: 0.8rem;
	text-align: left;
}

.stats-track {
	flex: 1;
	height: 22px;
	background: rgba(255, 255, 255, 0.08);
}

.stats-bar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	box-sizing: border-box;
	min-width: 0;
	height: 100%;
	padding: 0 5px 0 10px;
	background: #4caf50;
	color: white;
	font-size: 0.75rem;
	font-weight: 700;
}

.login-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24px 24px 0;
}

.login-eyebrow {
	color: #76c07a;
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
}

.login-copy,
.login-switch-copy {
	color: rgba(255, 255, 255, 0.68);
}

.login-copy {
	line-height: 1.5;
}

@media (max-width: 500px) {
	.login-card {
		width: 100%;
		min-height: 100vh;
		border-radius: 0;
	}

	.login-header {
		padding: 20px 20px 0;
	}
}
</style>
