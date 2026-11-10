#include <stdio.h>
int main(void) {
    int A[5], N, I, S = 0;
    scanf("%d", &N);
    if (N < 0 || N > 5) return 0;
    for (I = 0; I < N; I++) { scanf("%d", &A[I]); S += A[I]; }
    printf("Suma: %d\n", S);
    return 0;
}
