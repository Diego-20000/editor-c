#include <stdio.h>
int main(void) {
    int N, I;
    float X, S = 0.0f;
    scanf("%d", &N);
    if (N < 0 || N > 10) return 0;
    for (I = 0; I < N; I++) { scanf("%f", &X); S += X; }
    if (N == 0) printf("Sin muestras\n");
    else printf("Promedio: %.2f\n", S / N);
    return 0;
}
