#include <stdio.h>
int main() { int V[10]; char T[] = "hola"; double M[3][4]; char C; short S; printf("%zu %zu %zu %zu\n", sizeof(V), sizeof(V) / sizeof(V[0]), sizeof(T), sizeof(M)); printf("%zu %zu %zu %zu %zu %zu\n", sizeof(C), sizeof(S), sizeof(M[0]), sizeof(M[0][0]), sizeof(long), sizeof(float)); printf("%zu %zu\n", sizeof(char), sizeof(unsigned long)); return 0; }
