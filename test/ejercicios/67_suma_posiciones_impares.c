#include <stdio.h>
int main(void) {
    int A[8], N, I, S = 0;
    scanf("%d", &N);
    if (N < 1 || N > 8) return 0;
    for (I = 0; I < N; I++) {
        scanf("%d", &A[I]);
        if (I % 2 == 0) S += A[I];
    }
    printf("Suma de posiciones impares: %d\n", S);
    return 0;
}
