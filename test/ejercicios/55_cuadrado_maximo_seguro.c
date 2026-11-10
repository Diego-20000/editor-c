#include <stdio.h>
int main(void) {
    int N;
    scanf("%d", &N);
    if (N < 0 || N > 46340) printf("Fuera de rango\n");
    else printf("Cuadrado: %d\n", N * N);
    return 0;
}
