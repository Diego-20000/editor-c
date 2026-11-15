#include <stdio.h>
#include <string.h>
int palindromo(char T[], int A, int B) { if (A >= B) return 1; if (T[A] != T[B]) return 0; return palindromo(T, A + 1, B - 1); }
void invertir(int V[], int A, int B) { int T; if (A >= B) return; T = V[A]; V[A] = V[B]; V[B] = T; invertir(V, A + 1, B - 1); }
int potencia(int B, int E) { if (E == 0) return 1; if (E % 2) return B * potencia(B, E - 1); return potencia(B * B, E / 2); }
int main() { int V[5] = {1, 2, 3, 4, 5}, I; char A[] = "reconocer", B[] = "editor"; invertir(V, 0, 4); for (I = 0; I < 5; I++) printf("%d", V[I]); printf(" %d %d %d\n", palindromo(A, 0, strlen(A) - 1), palindromo(B, 0, strlen(B) - 1), potencia(3, 13)); return 0; }
