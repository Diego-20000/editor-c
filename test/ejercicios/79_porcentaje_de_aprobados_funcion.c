#include <stdio.h>
float PORCENTAJE(int A, int T);
int main(void) {
    int T, A;
    scanf("%d%d", &T, &A);
    if (T <= 0 || T > 1000 || A < 0 || A > T) printf("Datos invalidos\n");
    else printf("Aprobados: %.2f%%\n", PORCENTAJE(A, T));
    return 0;
}
float PORCENTAJE(int A, int T) { return (float)A * 100.0f / T; }
