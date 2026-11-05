#include <stdio.h>
int suma(int a, int b) { return a + b; }
float prom(int s, int n) { return (float)s / n; }
int main() {
    int a[10], i, n = 10, pos = 0, neg = 0, max, min;
    for (i = 0; i < n; i++) { a[i] = (i * 7 + 3) % 11 - 5; }
    max = a[0]; min = a[0];
    for (i = 0; i < n; i++) {
        if (a[i] > 0) pos++; else if (a[i] < 0) neg++;
        if (a[i] > max) max = a[i];
        if (a[i] < min) min = a[i];
        printf("%d ", a[i]);
    }
    printf("\npos=%d neg=%d max=%d min=%d suma=%d prom=%.3f\n", pos, neg, max, min, suma(max, min), prom(suma(max, min), 3));
    int x = 10, y = 3;
    printf("%d %d %d %f\n", x / y, x % y, x * y, (float) x / y);
    x = y = 7; printf("%d %d\n", x, y);
    for (;;) { x--; if (x < 3) break; }
    printf("%d\n", x);
    return 0;
}
