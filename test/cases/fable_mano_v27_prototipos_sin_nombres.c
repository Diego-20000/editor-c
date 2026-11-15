#include <stdio.h>
float area(float, float); void titulo(char[]); int cuenta(int[], int);
int main() { int V[3] = {1, 0, 1}; titulo("AREA"); printf("%.2f %d\n", area(2.5f, 4), cuenta(V, 3)); return 0; }
float area(float B, float H) { return B * H / 2; }
void titulo(char T[]) { printf("== %s ==\n", T); }
int cuenta(int V[], int N) { int I, C = 0; for (I = 0; I < N; I++) C += V[I]; return C; }
