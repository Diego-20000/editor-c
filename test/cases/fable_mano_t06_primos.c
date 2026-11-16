#include <stdio.h>
int primo(int N);
int main() { int N, I, C = 0; scanf("%d", &N); for (I = 2; C < N; I++) if (primo(I)) { printf("%d%c", I, ++C % 10 ? ' ' : '\n'); } printf("\n"); return 0; }
int primo(int N) { int D; if (N < 2) return 0; for (D = 2; D * D <= N; D++) if (N % D == 0) return 0; return 1; }
