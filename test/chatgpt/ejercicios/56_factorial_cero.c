#include <stdio.h>
int FACTORIAL(int N);
int main(void) {
    int N;
    scanf("%d", &N);
    if (N < 0 || N > 12) printf("Fuera de rango\n");
    else printf("Factorial: %d\n", FACTORIAL(N));
    return 0;
}
int FACTORIAL(int N) {
    int I, R = 1;
    for (I = 2; I <= N; I++) R *= I;
    return R;
}
